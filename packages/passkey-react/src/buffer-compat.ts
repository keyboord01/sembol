/**
 * Buffer BigInt-method compat shim.
 *
 * Bundlers that polyfill Node's `buffer` with a pre-6.x feross/buffer build
 * (Next.js ships one as `next/dist/compiled/buffer`) are missing the BigInt
 * accessors (`readBigInt64BE` & co). smart-account-kit >=0.5.0 hits them in
 * the browser while building deploy authorization entries, which crashes
 * wallet creation with "readBigInt64BE is not a function".
 *
 * Patching the polyfill's prototype once fixes every consumer of that module
 * instance (our code and the kit's alike). Real Node/browser Buffers that
 * already have the methods are left untouched.
 *
 * Vite is the exception: it "externalizes" an unresolved `buffer` import into
 * a stub whose every property access THROWS. Vite consumers do not need this
 * shim (the kit resolves the real buffer@6 there, which has the BigInt
 * methods), so the shim must fail soft instead of taking the app down. Hence
 * the namespace import and the guarded access below - never a named import,
 * which would throw at module-evaluation time under Vite.
 */
// @ts-ignore - resolved by the consumer's bundler (or Node); this package's
// tsconfig deliberately has no Node types.
import * as bufferModule from "buffer";

type Accessor = (this: Uint8Array, offset?: number) => bigint;
type Mutator = (this: Uint8Array, value: bigint, offset?: number) => number;

function view(buf: Uint8Array): DataView {
  return new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
}

const readers: Record<string, Accessor> = {
  readBigInt64BE(offset = 0) {
    return view(this).getBigInt64(offset, false);
  },
  readBigInt64LE(offset = 0) {
    return view(this).getBigInt64(offset, true);
  },
  readBigUInt64BE(offset = 0) {
    return view(this).getBigUint64(offset, false);
  },
  readBigUInt64LE(offset = 0) {
    return view(this).getBigUint64(offset, true);
  },
};

const writers: Record<string, Mutator> = {
  writeBigInt64BE(value, offset = 0) {
    view(this).setBigInt64(offset, value, false);
    return offset + 8;
  },
  writeBigInt64LE(value, offset = 0) {
    view(this).setBigInt64(offset, value, true);
    return offset + 8;
  },
  writeBigUInt64BE(value, offset = 0) {
    view(this).setBigUint64(offset, value, false);
    return offset + 8;
  },
  writeBigUInt64LE(value, offset = 0) {
    view(this).setBigUint64(offset, value, true);
    return offset + 8;
  },
};

let BufferCtor: { prototype?: Record<string, unknown> } | undefined;
try {
  BufferCtor =
    (bufferModule as unknown as { Buffer?: { prototype?: Record<string, unknown> } })?.Buffer ??
    (globalThis as { Buffer?: { prototype?: Record<string, unknown> } }).Buffer;
} catch {
  // Vite's externalized stub throws on any property access - nothing to patch.
  BufferCtor = (globalThis as { Buffer?: { prototype?: Record<string, unknown> } }).Buffer;
}

const proto = BufferCtor?.prototype;
if (proto) {
  for (const [name, fn] of [...Object.entries(readers), ...Object.entries(writers)]) {
    if (typeof proto[name] !== "function") {
      Object.defineProperty(proto, name, { value: fn, writable: true, configurable: true });
    }
  }
}

export {};
