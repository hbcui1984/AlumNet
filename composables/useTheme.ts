/**
 * 主题管理 - 组合式函数
 * 支持动态切换主题颜色，实现高校换肤
 */
import { ref, reactive } from 'vue'

/** 主题名称 */
export type ThemeName = 'default' | 'custom'

/** 主题配置 */
export interface ThemeConfig {
  primaryColor: string
  primaryLight: string
  primaryDark: string
  primaryRgb: string
  secondaryColor: string
  accentColor: string
}

/** 默认主题配置 */
const defaultTheme: ThemeConfig = {
  primaryColor: '#2B5CE6',
  primaryLight: '#5B7FED',
  primaryDark: '#1E3FA8',
  primaryRgb: '43, 92, 230',
  secondaryColor: '#F39C12',
  accentColor: '#27AE60'
}

/** 当前主题 */
const currentTheme = ref<ThemeName>('default')

/** 当前主题配置 */
const themeConfig = reactive<ThemeConfig>({ ...defaultTheme })

/** 是否已初始化 */
let initialized = false

/**
 * 将HEX颜色转换为RGB
 */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (result) {
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
  }
  return '43, 92, 230' // 默认值
}

/**
 * 应用主题到页面
 */
function applyTheme(config: ThemeConfig) {
  // 更新响应式配置
  Object.assign(themeConfig, config)

  // #ifdef H5
  // H5端通过CSS变量直接设置
  const root = document.documentElement
  root.style.setProperty('--primary-color', config.primaryColor)
  root.style.setProperty('--primary-light', config.primaryLight)
  root.style.setProperty('--primary-dark', config.primaryDark)
  root.style.setProperty('--primary-rgb', config.primaryRgb)
  root.style.setProperty('--secondary-color', config.secondaryColor)
  root.style.setProperty('--accent-color', config.accentColor)
  root.style.setProperty('--verified-color', config.primaryColor)
  root.style.setProperty('--gradient-primary',
    `linear-gradient(135deg, ${config.primaryColor} 0%, ${config.primaryLight} 100%)`)
  // #endif

  // #ifndef H5
  // 小程序端需要通过页面方式设置
  // 在 App.vue 中监听 themeConfig 变化并处理
  // #endif
}

/**
 * 主题管理Hook
 */
export function useTheme() {
  /**
   * 设置主题
   * @param themeName 主题名称
   * @param customConfig 自定义配置（仅当 themeName 为 'custom' 时使用）
   */
  const setTheme = (themeName: ThemeName, customConfig?: Partial<ThemeConfig>) => {
    let config: ThemeConfig

    if (themeName === 'custom' && customConfig) {
      // 自定义主题，合并默认配置
      config = { ...defaultTheme, ...customConfig }
      // 如果只提供了主色，自动计算RGB值
      if (customConfig.primaryColor && !customConfig.primaryRgb) {
        config.primaryRgb = hexToRgb(customConfig.primaryColor)
      }
    } else {
      // 使用默认主题
      config = { ...defaultTheme }
    }

    currentTheme.value = themeName
    applyTheme(config)

    // 持久化存储
    try {
      uni.setStorageSync('alumnet_theme', themeName)
      if (themeName === 'custom') {
        uni.setStorageSync('alumnet_theme_config', config)
      }
    } catch (e) {
      console.warn('保存主题配置失败', e)
    }
  }

  /**
   * 从学校配置加载主题
   */
  const loadSchoolTheme = async () => {
    try {
      // 尝试从云端获取学校配置
      const db = uniCloud.database()
      const res = await db.collection('alumni-school-config')
        .doc('school_config')
        .get()

      if (res.result?.data?.[0]?.theme) {
        const schoolTheme = res.result.data[0].theme
        setTheme('custom', schoolTheme)
        return true
      }
    } catch (e) {
      console.warn('加载学校主题失败', e)
    }

    // 尝试从本地配置文件加载
    try {
      const schoolConfig = require('@/config/school.config.js')
      if (schoolConfig.theme) {
        setTheme('custom', schoolConfig.theme)
        return true
      }
    } catch (e) {
      // 配置文件不存在，使用默认主题
    }

    return false
  }

  /**
   * 初始化主题
   * 应在 App.vue 的 onLaunch 中调用
   */
  const initTheme = async () => {
    if (initialized) return

    // 1. 优先从本地存储恢复
    try {
      const savedTheme = uni.getStorageSync('alumnet_theme') as ThemeName
      const savedConfig = uni.getStorageSync('alumnet_theme_config') as ThemeConfig

      if (savedTheme === 'custom' && savedConfig) {
        setTheme('custom', savedConfig)
        initialized = true
        return
      }
    } catch (e) {
      // 忽略存储读取错误
    }

    // 2. 从学校配置加载
    await loadSchoolTheme()
    initialized = true
  }

  /**
   * 重置为默认主题
   */
  const resetTheme = () => {
    setTheme('default')
    try {
      uni.removeStorageSync('alumnet_theme')
      uni.removeStorageSync('alumnet_theme_config')
    } catch (e) {
      // 忽略
    }
  }

  /**
   * 获取主题CSS变量（用于内联样式）
   * 小程序端不支持CSS变量时使用
   */
  const getThemeStyles = () => {
    return {
      '--primary-color': themeConfig.primaryColor,
      '--primary-light': themeConfig.primaryLight,
      '--primary-dark': themeConfig.primaryDark,
      '--primary-rgb': themeConfig.primaryRgb,
      '--secondary-color': themeConfig.secondaryColor,
      '--accent-color': themeConfig.accentColor,
    }
  }

  return {
    currentTheme,
    themeConfig,
    setTheme,
    initTheme,
    loadSchoolTheme,
    resetTheme,
    getThemeStyles,
    hexToRgb
  }
}

/**
 * 导出默认主题配置，供其他模块使用
 */
export { defaultTheme }
