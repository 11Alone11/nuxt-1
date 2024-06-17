import { consola } from 'consola'
import defu from 'defu'
import { resolve } from 'pathe'
import { isTest } from 'std-env'
import { withoutLeadingSlash } from 'ufo'
import { defineUntypedSchema } from 'untyped'
import type { ResolvedConfig as ViteOptions } from 'vite'

export default defineUntypedSchema({
  /**
   * Configuration that will be passed directly to Vite.
   *
   * See https://vitejs.dev/config for more information.
   * Please note that not all vite options are supported in Nuxt.
   * @type {typeof import('../src/types/config').ViteConfig & { $client?: typeof import('../src/types/config').ViteConfig, $server?: typeof import('../src/types/config').ViteConfig }}
   */
  vite: {
    root: {
      $resolve: async (val, get) => val ?? (await get('srcDir')),
    },
    mode: {
      $resolve: async (val, get) => val ?? (await get('dev') ? 'development' : 'production'),
    },
    define: {
      $resolve: async (val: Record<string, any> | undefined, get) => {
        const [isDev, isDebug] = await Promise.all([get('dev'), get('debug')]) as [boolean, boolean]
        return {
          '__VUE_PROD_HYDRATION_MISMATCH_DETAILS__': isDebug,
          'process.dev': isDev,
          'import.meta.dev': isDev,
          'process.test': isTest,
          'import.meta.test': isTest,
          ...val,
        }
      },
    },
    resolve: {
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
    },
    publicDir: {
      $resolve: (val) => {
        if (val) {
          consola.warn('Directly configuring the `vite.publicDir` option is not supported. Instead, set `dir.public`. You can read more in `https://nuxt.com/docs/api/nuxt-config#public`.')
        }
        return false
      },
    },
    vue: {
      isProduction: {
        $resolve: async (val, get) => val ?? !(await get('dev')),
      },
      template: {
        compilerOptions: {
          $resolve: async (val, get) => val ?? (await get('vue') as Record<string, any>).compilerOptions,
        },
        transformAssetUrls: {
          $resolve: async (val, get) => val ?? (await get('vue') as Record<string, any>).transformAssetUrls,
        },
      },
      script: {
        propsDestructure: {
          $resolve: async (val, get) => val ?? Boolean((await get('vue') as Record<string, any>).propsDestructure),
        },
        hoistStatic: {
          $resolve: async (val, get) => val ?? (await get('vue') as Record<string, any>).compilerOptions?.hoistStatic,
        },
      },
    },
    vueJsx: {
      $resolve: async (val: Record<string, any>, get) => {
        return {
          isCustomElement: (await get('vue') as Record<string, any>).compilerOptions?.isCustomElement,
          ...val,
        }
      },
    },
    optimizeDeps: {
      exclude: {
        $resolve: async (val: string[] | undefined, get) => [
          ...val || [],
          ...(await get('build.transpile') as Array<string | RegExp | ((ctx: { isClient?: boolean, isServer?: boolean, isDev: boolean }) => string | RegExp | false)>).filter(i => typeof i === 'string'),
          'vue-demi',
        ],
      },
    },
    esbuild: {
      jsxFactory: 'h',
      jsxFragment: 'Fragment',
      tsconfigRaw: {
        $resolve: async (val: Exclude<ViteOptions['esbuild'], false>['tsconfigRaw'], get) => {
          return defu(val, {
            compilerOptions: {
              experimentalDecorators: await get('experimental.decorators') as boolean
            }
          } satisfies Exclude<ViteOptions['esbuild'], false>['tsconfigRaw'])
        }
      }
    },
    clearScreen: true,
    build: {
      assetsDir: {
        $resolve: async (val, get) => val ?? withoutLeadingSlash((await get('app') as Record<string, string>).buildAssetsDir),
      },
      emptyOutDir: false,
    },
    server: {
      fs: {
        allow: {
          $resolve: async (val: string[] | undefined, get) => {
            const [buildDir, srcDir, rootDir, workspaceDir, modulesDir] = await Promise.all([get('buildDir'), get('srcDir'), get('rootDir'), get('workspaceDir'), get('modulesDir')]) as [string, string, string, string, string]
            return [...new Set([
              buildDir,
              srcDir,
              rootDir,
              workspaceDir,
              ...(modulesDir),
              ...val ?? [],
            ])]
          },
        },
      },
    },
    cacheDir: {
      $resolve: async (val, get) => val ?? resolve(await get('rootDir') as string, 'node_modules/.cache/vite'),
    },
  },
})
