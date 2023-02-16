//! WE NEED TO IMPORT OS BECAUSE ELSE NEXTJS IS NOT INCLUDING OAS INSIDE THE BUNDLE(PRODUCTION BUILD)
import oas from 'oas'
import { format as prettierFormat } from 'prettier'

import type { File } from '@kubb/core'
import { build } from '@kubb/core'
import createSwagger from '@kubb/swagger'
import createSwaggerTypescript from '@kubb/swagger-typescript'
import createSwaggerReactQuery from '@kubb/swagger-react-query'

import type { NextApiRequest, NextApiResponse } from 'next'
import type { Options } from 'prettier'

const formatOptions: Options = {
  tabWidth: 2,
  printWidth: 160,
  parser: 'typescript',
  singleQuote: true,
  semi: false,
  bracketSameLine: false,
  endOfLine: 'auto',
}
const format = (text?: string) => {
  if (!text) {
    return text
  }
  return prettierFormat(text, formatOptions)
}

console.log(typeof oas)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'POST') {
      //! WE NEED TO IMPORT OS BECAUSE ELSE NEXTJS IS NOT INCLUDING OAS INSIDE THE BUNDLE(PRODUCTION BUILD)
      const body = JSON.parse(req.body)
      const config = body.config || {
        root: './',
        output: {
          path: 'gen',
        },
        plugins: [
          ['@kubb/swagger', { output: false }],
          ['@kubb/swagger-typescript', { output: 'models.ts' }],
          ['@kubb/swagger-react-query', { output: './hooks' }],
        ],
      }
      const mappedPlugins = config.plugins?.map((plugin) => {
        if (Array.isArray(plugin)) {
          const [name, options = {}] = plugin as any[]

          if (name === '@kubb/swagger') {
            return createSwagger(options)
          }
          if (name === '@kubb/swagger-typescript') {
            return createSwaggerTypescript(options)
          }
          if (name === '@kubb/swagger-react-query') {
            return createSwaggerReactQuery(options)
          }
        }
        return plugin
      })

      const result = await build({
        config: {
          ...config,
          input: body.input,
          plugins: mappedPlugins,
        },
        mode: 'development',
      })

      const files = result.files
        .map((file) => {
          return { ...file, path: file.path.split('/gen/')[1] }
        })
        .filter((file) => file.path)
        .reduce((acc, file) => {
          if (!acc.find((item) => item.path === file.path)) {
            return [...acc, file]
          }
          return acc
        }, [] as File[])

      res.status(200).json(files)
      return
    }
    res.status(200).send(undefined)
  } catch (err) {
    console.log(err?.message || err)
    res.status(500).json({ error: err?.message || err })
  }
}
