import {
  Cartesian3,
  Check,
  defaultValue,
  defined,
  destroyObject,
  DeveloperError,
  PixelFormat as PF,
  PixelDatatype as PD,
  Sampler,
  ContextLimits,
  createGuid
} from 'cesium'

const PixelFormat = PF as any
const PixelDatatype = PD as any

/**
 * Webgl 3d纹理
 */
export class Texture3D {
  _id?: string
  _sampler?: typeof Sampler
  // webgl上下文
  _context?: any
  // 纹理目标
  _textureTarget?: any
  _texture?: any
  _dimensions?: any
  // 纹理宽度
  _width?: number
  // 纹理高度
  _height?: number
  // 纹理深度
  _depth?: number
  _textureFilterAnisotropic?: any
  // 纹理在GPU中的内部存储方式
  _internalFormat?: any
  // 纹理数据的格式，即数据在内存中的排列方式
  _pixelFormat?: any
  // 纹理数据的数据类型
  _pixelDatatype?: any
  _hasMinmap?: boolean
  _sizeInBytes?: number
  _preMultiplyAlpha?: boolean
  // 是否y轴翻转，使用贴图时需要设置为true
  _flipY?: boolean
  _initialized?: boolean

  constructor (options: any) {
    options = defaultValue(options, {})
    const { context, width, height, depth, source, flipY } = options

    const pixelFormat = defaultValue(options.pixelFormat, PixelFormat.RGBA)
    const pixelDatatype = defaultValue(options.pixelDataType, PixelDatatype.UNSIGNED_BYTE)
    const internalFormat = PixelFormat.toInternalFormat(pixelFormat, pixelDatatype, context)

    if (!defined(width) || !defined(height) || !defined(depth)) {
      throw new DeveloperError(
        'options requires a source field to create an 3d texture. width or height or dimension fileds'
      )
    }

    Check.typeOf.number.greaterThan('width', width, 0)

    if (width > ContextLimits.maximumTextureSize) {
      throw new DeveloperError(
        'width must be less than or equal to the maximum texture size'
      )
    }

    Check.typeOf.number.greaterThan('height', height, 0)

    if (height > ContextLimits.maximumTextureSize) {
      throw new DeveloperError(
        'height must be less than or equal to the maximum texture size'
      )
    }

    Check.typeOf.number.greaterThan('dimensions', depth, 0)

    if (depth > ContextLimits.maximumTextureSize) {
      throw new DeveloperError(
        'dimension must be less than or equal to the maximum texture size'
      )
    }

    if (!PixelFormat.validate(pixelFormat)) {
      throw new DeveloperError('Invalid options.pixelFormat.')
    }

    if (!PixelDatatype.validate(pixelDatatype)) {
      throw new DeveloperError('Invalid options.pixelDatatype.')
    }

    let initialized = true
    const gl = context._gl
    const textureTarget = gl.TEXTURE_3D
    const texture = gl.createTexture()

    // const lxs = gl.getParameter(gl.ACTIVE_TEXTURE)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(textureTarget, texture)
    let unpackAlignment = 4

    if (defined(source) && defined(source.arrayBufferView)) {
      unpackAlignment = PixelFormat.alignmentInBytes(pixelFormat, pixelDatatype, width)
    }

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, unpackAlignment)
    gl.pixelStorei(
      gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,
      gl.BROWSER_DEFAULT_WEBGL
    )

    if (defined(source)) {
      if (defined(source.arrayBufferView)) {
        const arrayBufferView = source.arrayBufferView

        gl.texImage3D(
          textureTarget,
          0, // 指定纹理的细节级别（mipmap 级别）。0 表示基本级别，1 及以上表示 mipmap 级别
          internalFormat,
          width,
          height,
          depth,
          0, // 指定纹理边框的宽度。在 OpenGL 3.1 及更高版本中，此参数必须为 0
          pixelFormat,
          PixelDatatype.toWebGLConstant(pixelDatatype, context),
          arrayBufferView
        )
        initialized = true
      }
    }
    gl.bindTexture(textureTarget, null)
    this._id = createGuid()
    this._context = context
    this._textureFilterAnisotropic = context._textureFilterAnisotropic
    this._textureTarget = textureTarget
    this._texture = texture
    this._internalFormat = internalFormat
    this._pixelFormat = pixelFormat
    this._pixelDatatype = pixelDatatype
    this._width = width
    this._height = height
    this._depth = depth
    this._dimensions = new Cartesian3(width, height, depth)
    this._hasMinmap = false
    this._sizeInBytes = 4
    this._preMultiplyAlpha = false
    this._flipY = flipY
    this._initialized = initialized
    this._sampler = undefined

    this.sampler = defined(options.sampler) ? options.sampler : new Sampler()
  }

  get id () {
    return this._id
  }
  get sampler () {
    return this._sampler
  }

  set sampler (sampler) {
    const minificationFilter = sampler.minificationFilter
    const magnificationFilter = sampler.magnificationFilter
    const context = this._context
    // const pixelFormat = this._pixelFormat
    // const pixelDatatype = this._pixelDatatype

    const gl = context._gl
    const target = this._textureTarget

    // 启用0号纹理单元
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(target, this._texture)
    // 3D纹理不设置放大、缩小、重采样
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minificationFilter)
    gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magnificationFilter)
    // 将纹理目标解绑，确保后续操作不会意外修改这个纹理
    gl.bindTexture(target, null)

    this._sampler = sampler
  }

  get dimensions () {
    return this._dimensions
  }
  get width () {
    return this._width
  }
  get height () {
    return this._height
  }
  get depth () {
    return this._depth
  }
  get _target () {
    return this._textureTarget
  }

  isDestroyed () {
    return false
  }

  destory () {
    this._context._gl.deleteTexture(this._texture)
    return destroyObject(this)
  }

  // Creates a texture, and copies a subimage of the framebuffer to it.
  fromFramebuffer (options: any) {
    options = defaultValue(options, {})
    Check.defined('options.context', options.context)

    const context = options.context
    const gl = context._gl

    const pixelFormat = defaultValue(options.pixelFormat, PixelFormat.RGB)
    // const framebufferXOffset = defaultValue(options.framebufferXOffset, 0)
    // const framebufferYOffset = defaultValue(options.framebufferYOffset, 0)
    const width = defaultValue(options.width, gl.drawingBufferWidth)
    const height = defaultValue(options.height, gl.drawingBufferHeight)
    const depth = defaultValue(options.depth, 128)
    const framebuffer = options.framebuffer

    const texture = new Texture3D({
      context: context,
      width: width,
      height: height,
      pixelFormat: pixelFormat,
      source: {
        framebuffer: defined(framebuffer) ? framebuffer : context.defaultFramebuffer,
        width: width,
        height: height,
        depth: depth,
      },
    })

    return texture
  }
}

