/// <reference types="vite/client" />
// with vite-plugin-vue-markdown, markdown files can be treated as Vue components
declare module '*.md' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<object, object, any>
  export default component
}
declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<object, object, any>
  export default component
}

declare interface Window {
  // extend the window
}

// cesium index.d.ts没有导出的类型在此补充
declare module 'cesium' {
  const DrawCommand: any
  const Pass: any
  const ShaderProgram: any
  const VertexArray: any
  const RenderState: any
  const PolylineVolumeGeometryLibrary: any
  const arrayRemoveDuplicates: any
  const PolygonPipeline: any
  const ShaderSource: any
  const BufferUsage: any
  const Texture: any
  const FrameState: any
  const Sampler: any
  const ContextLimits: any
}
