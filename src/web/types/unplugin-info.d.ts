// unplugin-info virtual modules type definitions

declare module '~build/time' {
  const buildTime: string;
  export default buildTime;
}

declare module '~build/package' {
  const packageInfo: {
    name: string;
    version: string;
    description?: string;
    [key: string]: any;
  };
  export default packageInfo;
}

declare module '~build/meta' {
  const metaInfo: {
    buildDate?: string;
    [key: string]: any;
  };
  export default metaInfo;
}

declare module '~build/info' {
  const buildInfo: {
    [key: string]: any;
  };
  export default buildInfo;
}

declare module '~build/git' {
  const gitInfo: {
    branch?: string;
    commit?: string;
    [key: string]: any;
  };
  export default gitInfo;
}

declare module '~build/env' {
  const envInfo: {
    NODE_ENV?: string;
    [key: string]: any;
  };
  export default envInfo;
}