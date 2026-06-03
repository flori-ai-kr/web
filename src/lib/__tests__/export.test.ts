import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { exportToCSV, exportToExcel, exportToPDF, type ExportConfig } from '../export'

// 다운로드 체인(URL.createObjectURL → a.click)을 가로채 생성된 Blob/파일명을 수집한다.
interface DownloadCapture {
  blobs: Blob[]
  filenames: string[]
}

// jsdom의 Blob은 .text()를 구현하지 않으므로 FileReader로 읽는다.
// 주의: readAsText는 UTF-8 BOM을 제거하므로 BOM 검증은 바이트 단위로 한다.
function blobToText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
}

function installDownloadCapture(): DownloadCapture {
  const capture: DownloadCapture = { blobs: [], filenames: [] }

  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: Blob | MediaSource) => {
    capture.blobs.push(blob as Blob)
    return 'blob:mock'
  })
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

  const realCreate = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    const el = realCreate(tag) as HTMLElement
    if (tag === 'a') {
      // jsdom의 anchor click은 네비게이션을 시도하지 않도록 무력화
      ;(el as HTMLAnchorElement).click = () => {
        capture.filenames.push((el as HTMLAnchorElement).download)
      }
    }
    return el
  })

  return capture
}

interface Row {
  name: string
  amount: number
}

const baseConfig = (overrides: Partial<ExportConfig<Row>> = {}): ExportConfig<Row> => ({
  filename: 'report',
  title: '매출 리포트',
  columns: [
    { header: '이름', accessor: (r) => r.name, format: 'text' },
    { header: '금액', accessor: (r) => r.amount, format: 'currency' },
  ],
  data: [
    { name: '홍길동', amount: 50000 },
    { name: '김철수', amount: 1200000 },
  ],
  ...overrides,
})

describe('exportToCSV', () => {
  let capture: DownloadCapture

  beforeEach(() => {
    capture = installDownloadCapture()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function csvText(config: ExportConfig<Row>): Promise<string> {
    exportToCSV(config)
    expect(capture.blobs).toHaveLength(1)
    return blobToText(capture.blobs[0])
  }

  it('UTF-8 BOM 바이트(EF BB BF)로 시작한다(엑셀 한글 호환)', async () => {
    exportToCSV(baseConfig())
    const bytes = await blobToBytes(capture.blobs[0])
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf])
  })

  it('첫 행은 헤더로 출력한다', async () => {
    const text = await csvText(baseConfig())
    expect(text.split('\n')[0]).toBe('이름,금액')
  })

  it('currency 포맷은 천 단위 구분 기호를 적용한다', async () => {
    const text = await csvText(baseConfig())
    const lines = text.replace('﻿', '').split('\n')
    expect(lines[1]).toBe('홍길동,"50,000"')
    expect(lines[2]).toBe('김철수,"1,200,000"')
  })

  it('.csv 확장자가 붙은 파일명으로 다운로드를 트리거한다', async () => {
    await csvText(baseConfig({ filename: 'sales-2026' }))
    expect(capture.filenames).toEqual(['sales-2026.csv'])
  })

  it('text/csv MIME 타입의 Blob을 생성한다', async () => {
    await csvText(baseConfig())
    expect(capture.blobs[0].type).toContain('text/csv')
  })

  it('쉼표가 포함된 값은 큰따옴표로 감싼다', async () => {
    const text = await csvText(
      baseConfig({
        columns: [{ header: '주소', accessor: (r) => r.name, format: 'text' }],
        data: [{ name: '서울, 강남구', amount: 0 }],
      })
    )
    expect(text.replace('﻿', '').split('\n')[1]).toBe('"서울, 강남구"')
  })

  it('큰따옴표가 포함된 값은 이스케이프(연속 따옴표)한다', async () => {
    const text = await csvText(
      baseConfig({
        columns: [{ header: '메모', accessor: (r) => r.name, format: 'text' }],
        data: [{ name: '그는 "안녕"이라 했다', amount: 0 }],
      })
    )
    expect(text.replace('﻿', '').split('\n')[1]).toBe('"그는 ""안녕""이라 했다"')
  })

  it('개행이 포함된 값은 큰따옴표로 감싼다', async () => {
    const text = await csvText(
      baseConfig({
        columns: [{ header: '메모', accessor: (r) => r.name, format: 'text' }],
        data: [{ name: '첫줄\n둘째줄', amount: 0 }],
      })
    )
    // 따옴표로 감싸진 필드 안에 개행이 보존된다
    expect(text).toContain('"첫줄\n둘째줄"')
  })

  it('헤더에 특수문자가 있으면 헤더도 이스케이프한다', async () => {
    const text = await csvText(
      baseConfig({
        columns: [{ header: '이름, 별명', accessor: (r) => r.name, format: 'text' }],
        data: [],
      })
    )
    expect(text.replace('﻿', '').split('\n')[0]).toBe('"이름, 별명"')
  })

  it('데이터가 비어 있으면 헤더 행만 출력한다', async () => {
    const text = await csvText(baseConfig({ data: [] }))
    const lines = text.replace('﻿', '').split('\n')
    expect(lines).toHaveLength(1)
    expect(lines[0]).toBe('이름,금액')
  })

  it('currency 포맷이라도 숫자가 아니면 문자열로 출력한다', async () => {
    const text = await csvText(
      baseConfig({
        columns: [{ header: '금액', accessor: () => '미정', format: 'currency' }],
        data: [{ name: 'x', amount: 0 }],
      })
    )
    expect(text.replace('﻿', '').split('\n')[1]).toBe('미정')
  })

  it('null/undefined 셀 값은 빈 문자열로 처리한다', async () => {
    const text = await csvText(
      baseConfig({
        columns: [
          { header: 'A', accessor: () => null as unknown as string, format: 'text' },
          { header: 'B', accessor: () => undefined as unknown as string, format: 'text' },
        ],
        data: [{ name: 'x', amount: 0 }],
      })
    )
    expect(text.replace('﻿', '').split('\n')[1]).toBe(',')
  })
})

describe('exportToExcel', () => {
  let capture: DownloadCapture

  beforeEach(() => {
    capture = installDownloadCapture()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('.xlsx 파일명과 스프레드시트 MIME의 Blob을 생성한다', async () => {
    await exportToExcel(baseConfig({ filename: 'sales' }))
    expect(capture.filenames).toEqual(['sales.xlsx'])
    expect(capture.blobs).toHaveLength(1)
    expect(capture.blobs[0].type).toContain('spreadsheetml.sheet')
    expect(capture.blobs[0].size).toBeGreaterThan(0)
  })

  it('데이터가 비어 있어도 정상적으로 워크북을 생성한다', async () => {
    await exportToExcel(baseConfig({ data: [] }))
    expect(capture.blobs).toHaveLength(1)
    expect(capture.blobs[0].size).toBeGreaterThan(0)
  })
})

describe('exportToPDF', () => {
  let capture: DownloadCapture

  beforeEach(() => {
    capture = installDownloadCapture()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('데이터가 있는 표를 예외 없이 PDF로 생성한다', async () => {
    await expect(exportToPDF(baseConfig({ filename: 'sales' }))).resolves.toBeUndefined()
  })

  it('데이터가 없어도 예외 없이 PDF를 생성한다', async () => {
    await expect(exportToPDF(baseConfig({ data: [] }))).resolves.toBeUndefined()
  })
})
