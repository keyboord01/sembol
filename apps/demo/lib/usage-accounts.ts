/**
 * Public registry of Sembol Cloud sponsor/channel accounts, by project.
 *
 * These are PUBLIC keys only - safe to commit, and deliberately kept out of the
 * secret config so the usage page works on a deployment that holds no sponsor
 * secrets at all. When a project is onboarded, add its channel public keys here.
 *
 * Because every project has its own channel accounts, the chain itself is the
 * per-project usage ledger: no database required, and the record reaches back
 * to the first transaction a project ever sponsored.
 */
export type UsageNetwork = "mainnet" | "testnet";

export interface UsageProject {
  /** Project key as used in the X-Sembol-Key header. */
  key: string;
  label: string;
  network: UsageNetwork;
  /** Channel / sponsor account public keys. */
  accounts: string[];
  /** What this project is, in one line, for the public page. */
  note?: string;
}

export const USAGE_PROJECTS: UsageProject[] = [
  {
    key: "sembol-mainnet",
    label: "Sembol (mainnet)",
    network: "mainnet",
    accounts: ["GBWUM6U4HSTM4CCD6APKROCJPJXBRQTRE67A37ERI424N3AW4DAUDWLS"],
    note: "The mainnet sponsor: real wallets on the public network, on audited contracts.",
  },
  {
    key: "sembol-app",
    label: "Sembol demo",
    network: "testnet",
    accounts: [
      "GDNUAHNI4EUZOJDI2Q64JIFXQPY6FTHA54B4L3TPCO2FRHCKTVAWN5KY",
      "GD2QWLQE7IJR6C7CDTEKHCXHNHX6RHAIG4Y5UVK2TBKTLSBZUHMFHXCY",
      "GAPJHN7FB5MOSBX36WAOCT4CPX4Q7ODRX7HD3N54ZVE35ONVFQ6NA2UH",
    ],
    note: "The reference app at sembol.xyz.",
  },
  {
    key: "sembol-event",
    label: "Events",
    network: "testnet",
    accounts: [
      "GBMA3AUXX3EZDVVXFG25HBB6TLZTHC4RFUSAYYHB6RCUUVMMJ235MGYZ",
      "GD26J5WHM5ZHLD6LQR7VB2MAYVAR3AFI6Q5JODIZXKZDUPYCY6W4TZYD",
    ],
    note: "Wallets opened at hackathons and workshops.",
  },
];

export const HORIZON: Record<UsageNetwork, string> = {
  mainnet: "https://horizon.stellar.org",
  testnet: "https://horizon-testnet.stellar.org",
};

export const EXPLORER: Record<UsageNetwork, string> = {
  mainnet: "https://stellar.expert/explorer/public",
  testnet: "https://stellar.expert/explorer/testnet",
};
