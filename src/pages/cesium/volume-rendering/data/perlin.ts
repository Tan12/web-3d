import * as Cesium from 'cesium'
import { noise } from './noise'
import { Texture3D } from './Texture3D'

const ComponentDatatype = Cesium.ComponentDatatype as any

const fragmentShaderSource = `
  precision highp float;
  precision highp sampler3D;
  #define epsilon 0.0001
  uniform float slice_size;
  uniform sampler3D volumnTexture;
  uniform vec3 halfdim;

  uniform float threshold;

  uniform float steps; 

  out vec4 color;

  in vec3 vOrigin;
  in vec3 vDirection;
  in vec2 vst;

  float getData(vec3 apos) {
    vec3 pos=apos/(halfdim*2.);
    
    return texture(volumnTexture,pos).a;
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
  vec3 normal( vec3 coord ) {
    if ( coord.x < epsilon ) return vec3( 1.0, 0.0, 0.0 );
    if ( coord.y < epsilon ) return vec3( 0.0, 1.0, 0.0 );
    if ( coord.z < epsilon ) return vec3( 0.0, 0.0, 1.0 );
    if ( coord.x > 1.0 - epsilon ) return vec3( - 1.0, 0.0, 0.0 );
    if ( coord.y > 1.0 - epsilon ) return vec3( 0.0, - 1.0, 0.0 );
    if ( coord.z > 1.0 - epsilon ) return vec3( 0.0, 0.0, - 1.0 );

    float step = 0.01;
    float x = getData( coord + vec3( - step, 0.0, 0.0 ) ) - getData( coord + vec3( step, 0.0, 0.0 ) );
    float y = getData( coord + vec3( 0.0, - step, 0.0 ) ) - getData( coord + vec3( 0.0, step, 0.0 ) );
    float z = getData( coord + vec3( 0.0, 0.0, - step ) ) - getData( coord + vec3( 0.0, 0.0, step ) );

    return normalize( vec3( x, y, z ) );
  }

  void main()  {
    vec3 rayDir=normalize(vDirection);
    vec2 bounds=hitBox(vOrigin,rayDir);

    if(bounds.x>bounds.y) discard;
    bounds.x=max(bounds.x,0.0);

    vec3 p=vOrigin+bounds.x*rayDir;
    vec3 inc=1.0/abs(rayDir);
    float delta=min(inc.x,min(inc.y,inc.z));
    delta/=steps;

    for ( float t = bounds.x; t < bounds.y; t += delta ){
      float d=getData(p+halfdim);
      if(d>threshold){
        color.rgb=normal(p+0.5)*0.5+(p*1.5+0.25);
        // color=vec4(d);
        color.a=1.;
        break;
      }
      p+=rayDir*delta;
    }

    if(color.a==0.) discard;
  }
`
const vertexShaderSource = `
  in vec3 position;
  in vec2 st;

  out vec3 vOrigin;
  out vec3 vDirection;
  out vec2 vst;

  void main()  {
    // 求出相机模型坐标，即射线起点
    vOrigin=czm_encodedCameraPositionMCHigh+czm_encodedCameraPositionMCLow;
    // 计算射线朝向
    vDirection=position-vOrigin;
    vst=st;

    gl_Position = czm_modelViewProjection * vec4(position,1.0);
  }
`

/**
 * 生成体数据
 */
export function generateData (size = 128) {
  const data = new Uint8Array(size * size * size)
  let dx, dy, dz
  let i = 0

  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        dx = (x * 1.0) / size
        dy = (y * 1.0) / size
        dz = (z * 1.0) / size
        const d = noise(dx * 6.5, dy * 6.5, dz * 6.5)

        data[i++] = d * 128 + 128
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
    steps: 200,
    threshold: 0.6,
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

  createCommand (context: any) {
    if (!Cesium.defined(this.geometry)) return
    const geometry = Cesium.BoxGeometry.createGeometry(this.geometry)

    if (!geometry) return
    const attributelocations = Cesium.GeometryPipeline.createAttributeLocations(geometry)

    this.vertexarray = Cesium.VertexArray.fromGeometry({
      context,
      geometry,
      attributes: attributelocations,
    })
    const renderstate = Cesium.RenderState.fromCache({
      depthTest: { enabled: true },
      cull: { enabled: false },
    })
    const shaderProgram = Cesium.ShaderProgram.fromCache({
      context: context,
      vertexShaderSource,
      fragmentShaderSource,
      attributeLocations: attributelocations,
    })
    const that = this
    const uniformmap = {
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
    }

    this.drawCommand = new Cesium.DrawCommand({
      boundingVolume: (this.geometry as any).boundingSphere,
      modelMatrix: this.modelMatrix,
      pass: Cesium.Pass.OPAQUE,
      shaderProgram: shaderProgram,
      renderState: renderstate,
      vertexArray: this.vertexarray,
      uniformMap: uniformmap,
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

