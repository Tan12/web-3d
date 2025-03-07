/**
 * 菜单配置
 */
export const cesiumMenu = [
  {
    id: '1',
    name: '体渲染',
    icon: '',
    children: [
      { name: '体积云', path: '/cesium/volume-rendering/cloud' },
      { name: '柏林噪声', path: '/cesium/volume-rendering/perlin' },
    ],
  },
]

export const threeMenu = [
  {
    id: '1',
    name: '效果渲染',
    icon: '',
    children: [
      { name: '辉光', path: '/threejs/effects/glow' },
    ],
  },
]
