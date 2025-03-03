/**
 * 判断是否支持webGl
 * @returns
 */
export const isSupportWebGL = (): boolean => {
  try {
    const canvas = <HTMLCanvasElement>document.createElement('canvas')

    return !!(
      window.WebGL2RenderingContext &&
      (
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl')
      )
    )
  } catch (e) {
    return false
  }
}