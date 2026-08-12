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
 */
// @ts-ignore - resolved by the consumer's bundler (or Node); this package's
// tsconfig deliberately has no Node types.
import { Buffer } from "buffer";

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

const proto = (Buffer as unknown as { prototype?: Record<string, unknown> })?.prototype;
if (proto) {
  for (const [name, fn] of [...Object.entries(readers), ...Object.entries(writers)]) {
    if (typeof proto[name] !== "function") {
      Object.defineProperty(proto, name, { value: fn, writable: true, configurable: true });
    }
  }
}

export {};
