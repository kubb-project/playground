import { useEffect, useMemo } from 'react'
import { useAtom } from 'jotai'
import useSWRMutation from 'swr/mutation'
import useSWR from 'swr'
import { Center, CircularProgress, useToast, VStack } from '@chakra-ui/react'
import styled from '@emotion/styled'
import { loader } from '@monaco-editor/react'
import { Err } from 'ts-results'

import Configuration from './Configuration'
import VersionSelect from './VersionSelect'
import InputEditor from './InputEditor'
import OutputEditor from './OutputEditor'

import { versionAtom } from '../kubb'
import { codeAtom, configAtom } from '../state'

import type { TransformationResult } from '../kubb'

const Main = styled.main`
  display: grid;
  padding: 1em;
  gap: 1em;

  grid-template-columns: 1fr;
  grid-template-rows: repeat(3, 1fr);
  grid-template-areas: 'sidebar' 'input' 'output';

  min-height: 88vh;

  @media screen and (min-width: 600px) {
    grid-template-columns: 256px 1fr;
    grid-template-rows: repeat(2, 1fr);
    grid-template-areas: 'sidebar input' 'sidebar output';

    min-height: calc(100vh - 80px);
  }

  @media screen and (min-width: 1200px) {
    grid-template-columns: 256px repeat(2, 1fr);
    grid-template-rows: 1fr;
    grid-template-areas: 'sidebar input output';

    min-height: calc(100vh - 80px);
  }
`

const fetchOutput = (url: string, { arg }) =>
  fetch(url, {
    method: 'POST',
    body: JSON.stringify(arg.code),
  }).then((response) => response.text())

export default function Workspace() {
  const { data: monaco } = useSWR('monaco', () => loader.init())
  const [version] = useAtom(versionAtom)
  const { trigger, data: kubbOutput, error } = useSWRMutation(`/api/parse`, fetchOutput)
  const [code] = useAtom(codeAtom)
  const [config] = useAtom(configAtom)

  useEffect(() => {
    trigger({ code })
  }, [code])

  const output = useMemo(() => {
    if (error) {
      return Err(String(error))
    }

    if (!kubbOutput) {
      return Err('Loading Kubb...')
    }

    return {
      val: {
        code: kubbOutput,
      },
    } as unknown as TransformationResult
  }, [code, kubbOutput, error, config])
  const toast = useToast()

  useEffect(() => {
    if (error) {
      toast({
        title: 'Failed to load Kubb.',
        description: String(error),
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
    }
  }, [error, toast])

  const isLoadingMonaco = !monaco
  if (isLoadingMonaco && !kubbOutput) {
    return (
      <Center width="full" height="88vh" display="flex" flexDirection="column">
        <CircularProgress isIndeterminate mb="3" />
        <div>
          Loading Kubb {version}
          {isLoadingMonaco && ' and editor'}...
        </div>
      </Center>
    )
  }

  return (
    <Main>
      <VStack spacing={4} alignItems="unset" gridArea="sidebar">
        <Configuration />
        <VersionSelect isLoading={!kubbOutput && !error} />
      </VStack>
      <InputEditor output={output} />
      <OutputEditor output={output} />
    </Main>
  )
}
