import * as Cesium from 'cesium'
import { noise } from './noise'
import { Texture3D } from './Texture3D'

const ComponentDatatype = Cesium.ComponentDatatype as any

const fragmentShaderSource = `
  // 定义高精度范围
  precision highp float;
  precision highp sampler3D;
  #define epsilon 0.0001
  uniform float slice_size;
  uniform vec3 halfdim;

  uniform vec3 base;
  uniform sampler3D volumnTexture;
  uniform float threshold;
  uniform float range;
  uniform float opacity;
  uniform float steps;
  uniform float frame;

  out vec4 color;

  in vec3 vOrigin;
  in vec3 vDirection;
  in vec2 vst;

  uint wang_hash(uint seed) {
    seed = (seed ^ 61u) ^ (seed >> 16u);
    seed *= 9u;
    seed = seed ^ (seed >> 4u);
    seed *= 0x27d4eb2du;
    seed = seed ^ (seed >> 15u);
    return seed;
  }

  float randomFloat(inout uint seed) {
    return float(wang_hash(seed)) / 4294967296.;
  }

  float getData(vec3 pos_temp){
    vec3 pos=pos_temp/(halfdim*2.);
    
    return texture(volumnTexture,pos).a;
  }

  float shading( vec3 coord ) {
    float step = 0.01;
    return getData( coord + vec3( - step ) ) - getData( coord + vec3( step ) );
  }

  vec4 linearToSRGB( in vec4 value ) {
    return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
  }

  vec2 hitBox( vec3 orig, vec3 dir ) {
    vec3 box_min = vec3( -halfdim );
    vec3 box_max = vec3( halfdim );
    vec3 inv_dir = 1.0 / dir;
    vec3 tmin_tmp = ( box_min - orig ) * inv_dir;
    vec3 tmax_tmp = ( box_max - orig ) * inv_dir;
    vec3 tmin = min( tmin_tmp, tmax_tmp );
    vec3 tmax = max( tmin_tmp, tmax_tmp );
    float t0 = max( tmin.x, max( tmin.y, tmin.z ) );
    float t1 = min( tmax.x, min( tmax.y, tmax.z ) );
    return vec2( t0, t1 );
  }

  void main(){
    vec3 rayDir=normalize(vDirection);
    vec2 bounds=hitBox(vOrigin,rayDir);

    if(bounds.x>bounds.y) discard;
    bounds.x=max(bounds.x,0.0);

    vec3 p=vOrigin+bounds.x*rayDir;
    vec3 inc=1.0/abs(rayDir);
    float delta=min(inc.x,min(inc.y,inc.z));
    delta/=steps;

    // Jitter

    // Nice little seed from
    // https://blog.demofox.org/2020/05/25/casual-shadertoy-path-tracing-1-basic-camera-diffuse-emissive/
    uint seed = uint( gl_FragCoord.x ) * uint( 1973 ) + uint( gl_FragCoord.y ) * uint( 9277 ) + uint( frame ) * uint( 26699 );
    vec3 size = vec3( textureSize( volumnTexture, 0 ) );
    float randNum = randomFloat( seed ) * 2.0 - 1.0;
    p += rayDir * randNum * ( 1.0 / size );

    vec4 ac = vec4( base, 0.0 );

    for ( float t = bounds.x; t < bounds.y; t += delta ) {
      float d = getData( p + 0.5 );

      d = smoothstep( threshold - range, threshold + range, d ) * opacity;

      float col = shading( p + 0.5 ) * 3.0 + ( ( p.x + p.y ) * 0.25 ) + 0.2;

      ac.rgb += ( 1.0 - ac.a ) * d * col;

      ac.a += ( 1.0 - ac.a ) * d;

      if ( ac.a >= 0.95 ) break;

      p += rayDir * delta;
    }

    color = linearToSRGB( ac );

    if ( color.a == 0.0 ) discard;
    // out_FragColor = color;
  }
`
const vertexShaderSource = `
  in vec3 position;
  in vec2 st;

  out vec3 vOrigin;
  out vec3 vDirection;
  out vec2 vst;

  void main() {    
    vOrigin=czm_encodedCameraPositionMCHigh+czm_encodedCameraPositionMCLow;
    vDirection=position-vOrigin;
    vst=st;

    gl_Position = czm_modelViewProjection * vec4(position,1.0);
  }
`

/**
 * 生成体数据
 * @param size 3D纹理的尺寸
 * @param scale 缩放因子，用于控制噪声函数的输入范围
 * @returns
 */
export function generateData (size = 128, scale = 0.05) {
  // 顶点总数
  const data = new Uint8Array(size * size * size)
  let i = 0
  const vector = new Cesium.Cartesian3()

  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        Cesium.Cartesian3.add(
          new Cesium.Cartesian3(x, y, z),
          new Cesium.Cartesian3(-size / 2, -size / 2, -size / 2),
          vector
        )
        // 将坐标归一化到 [-0.5, 0.5] 范围
        Cesium.Cartesian3.divideByScalar(vector, size, vector)

        const d = 1.0 - Cesium.Cartesian3.distance(vector, Cesium.Cartesian3.ZERO)

        data[i] = (128 + 128 * noise((x * scale) / 1.5, y * scale, (z * scale) / 1.5)) * d * d
        i++
      }
    }
  }
  return data
}

export class CustomPrimitive {
  size = 128

  modelMatrix?: Cesium.Matrix4
  geometry?: Cesium.BoxGeometry
  data?: Uint8Array
  dim?: Cesium.Cartesian3
  drawCommand?: typeof Cesium.DrawCommand
  halfdim?: Cesium.Cartesian3
  vertexarray?: typeof Cesium.VertexArray

  texture?: any

  viewModel = {
    steps: 100,
    opacity: 0.25,
    range: 0.1,
    threshold: 0.25,
    frame: 0,
  }

  constructor (options: {
    modelMatrix: Cesium.Matrix4
    geometry: Cesium.BoxGeometry
    data: Uint8Array
    dim: Cesium.Cartesian3
    size?: number
  }) {
    this.drawCommand = undefined

    if (Cesium.defined(options)) {
      this.modelMatrix = options.modelMatrix
      this.geometry = options.geometry
      this.data = options.data
      this.halfdim = new Cesium.Cartesian3()
      if (Cesium.defined(options.size)) {
        this.size = options.size
      }
      Cesium.Cartesian3.divideByScalar(options.dim, 2, this.halfdim)
    }
  }

  createCommand (context: string) {
    if (!Cesium.defined(this.geometry)) return
    const geometry = Cesium.BoxGeometry.createGeometry(this.geometry)

    if (!geometry) return
    const attributelocations = Cesium.GeometryPipeline.createAttributeLocations(geometry)

    this.vertexarray = Cesium.VertexArray.fromGeometry({
      context,
      geometry,
      attributes: attributelocations,
    })
    const renderState = Cesium.RenderState.fromCache({
      depthTest: { enabled: true },
      cull: { enabled: false },
    })
    const shaderProgram = Cesium.ShaderProgram.fromCache({
      context,
      vertexShaderSource,
      fragmentShaderSource,
      attributeLocations: attributelocations,
    })
    const that = this
    const uniformMap = {
      base () {
        return Cesium.Color.fromCssColorString('#798aa0')
      },
      slice_size () {
        return that.size
      },
      volumnTexture () {
        return that.getTexture(context)
      },
      halfdim () {
        return that.halfdim
      },
      threshold: function () {
        return that.viewModel.threshold
      },
      steps: function () {
        return that.viewModel.steps
      },
      range: function () {
        return that.viewModel.range
      },
      opacity: function () {
        return that.viewModel.opacity
      },
      frame: function () {
        return that.viewModel.frame
      },
    }

    this.drawCommand = new Cesium.DrawCommand({
      boundingVolume: (this.geometry as any).boundingSphere,
      /* 模型变换矩阵 */
      modelMatrix: this.modelMatrix,
      /* 渲染通道，此次使用的是不透明物体类型 */
      pass: Cesium.Pass.OPAQUE,
      /* 着色器程序对象 */
      shaderProgram,
      /* 渲染状态对象，封装如深度测试（depthTest）、剔除（cull）、混合（blending）等状态类型的参数设置 */
      renderState,
      /* 顶点数组 */
      vertexArray: this.vertexarray,
      /* 用于传递uniform具体的值，key是uniform变量名，value是回调函数 */
      uniformMap,
    })
  }
  getTexture (context: any) {
    if (!this.texture && this.data) {
      const texture_size = Math.ceil(Math.sqrt(this.data.length))

      this.texture = new Texture3D({
        width: this.size,
        height: this.size,
        depth: this.size,
        context: context,
        flipY: false,
        pixelFormat: Cesium.PixelFormat.ALPHA,
        pixelDataType: ComponentDatatype.fromTypedArray(this.data),
        source: {
          width: texture_size,
          height: texture_size,
          arrayBufferView: this.data,
        },
        sampler: new Cesium.Sampler({
          minificationFilter: Cesium.TextureMinificationFilter.LINEAR,
          magnificationFilter: Cesium.TextureMagnificationFilter.LINEAR,
        }),
      })
    }

    return this.texture
  }
  /**
   * 实现Primitive接口，供Cesium内部在每一帧中调用
   * @param {Cesium.FrameState} frameState
   */
  update (frameState: typeof Cesium.FrameState) {
    if (!this.drawCommand) {
      this.createCommand(frameState.context)
    }
    frameState.commandList.push(this.drawCommand)
  }
  isDestroyed () {
    return false
  }
}

