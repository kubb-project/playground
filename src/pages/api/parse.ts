//! WE NEED TO IMPORT OS BECAUSE ELSE NEXTJS IS NOT INCLUDING OAS INSIDE THE BUNDLE(PRODUCTION BUILD)
import oas from 'oas'

import type { File } from '@kubb/core'
import { build } from '@kubb/core'
import createSwagger from '@kubb/swagger'
import createSwaggerTs from '@kubb/swagger-ts'
import createSwaggerReactQuery from '@kubb/swagger-react-query'
import createSwaggerZod from '@kubb/swagger-zod'

import { s3Client, uploadObject } from '../../aws'

import type { S3Client } from '@aws-sdk/client-s3'
import type { NextApiRequest, NextApiResponse } from 'next'

//! WE NEED TO IMPORT OAS BECAUSE ELSE NEXTJS IS NOT INCLUDING OAS INSIDE THE BUNDLE(PRODUCTION BUILD)
console.log(typeof oas)

export const buildKubbFiles = async ({ body }: { body: any }, options: { client: S3Client } = { client: s3Client }) => {
  const signedUrl = await uploadObject(body.input, options)
  const config = body.config || {
    root: './',
    output: {
      path: 'gen',
    },
    plugins: [
      ['@kubb/swagger', { output: false }],
      ['@kubb/swagger-ts', { output: 'models.ts' }],
      ['@kubb/swagger-zod', { output: './zod' }],
      ['@kubb/swagger-react-query', { output: './hooks' }],
    ],
  }
  const mappedPlugins = config.plugins?.map((plugin) => {
    if (Array.isArray(plugin)) {
      const [name, options = {}] = plugin as any[]

      if (name === '@kubb/swagger') {
        return createSwagger(options)
      }
      if (name === '@kubb/swagger-ts') {
        return createSwaggerTs(options)
      }
      if (name === '@kubb/swagger-react-query') {
        return createSwaggerReactQuery(options)
      }
      if (name === '@kubb/swagger-zod') {
        return createSwaggerZod(options)
      }
    }
    return plugin
  })

  const result = await build({
    config: {
      ...config,
      input: {
        path: signedUrl,
      },
      output: {
        ...config.output,
        write: false,
      },
      plugins: mappedPlugins,
    },
    mode: 'development',
  })

  return result.files
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
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'POST') {
      const { body } = req
      const files = await buildKubbFiles({ body })
      res.status(200).json(files)
      return
    }
    res.status(200).send(undefined)
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: err?.message || err })
  }
}
