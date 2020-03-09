export interface JudgeClientSystemInfo {
  // e.g. Ubuntu 18.04.2 LTS
  os: string;

  // e.g. Linux 4.15.0-76-generic
  kernel: string;

  // e.g. x64
  arch: string;

  cpu: {
    // e.g. Common KVM processor @ 4x 3.59GHz
    model: string;

    // e.g. fpu vme de pse...
    flags: string;

    // e.g. { L1d: 32768, L1i: 32768, L2: 262144, L3: 6291456 }
    cache: Record<string, number>;
  };

  memory: {
    // e.g. 8062784
    size: number;

    // e.g. SODIMM DDR3 1600MHz
    description: string;
  };

  // languageName => compilers
  // TODO: Use a manually generated yaml file in sandbox rootfs to get compilers' versions
  languages: Record<
    string,
    {
      name: string;
      version: string;
    }[]
  >;

  extraInfo: string;
}
