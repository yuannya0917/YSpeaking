declare module 'vite-plugin-imp' {
  const vitePluginImp: (options: {
    libList: Array<{
      libName: string
      style?: (name: string) => string | string[]
      libDirectory?: string
      camel2DashComponentName?: boolean
    }>
  }) => any

  export default vitePluginImp
}
