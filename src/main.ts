import './style.css'
import alasql from 'alasql'

interface Row {
  subnet_uid: number
  top_miner_uid: number
  incentive_amount: number
}

let data: Row[] = []
let currentResult: any[] = []
let sortCol: string | null = null
let sortAsc = true

const DEFAULT_QUERY = 'SELECT * FROM data ORDER BY incentive_amount DESC'

async function loadCSV(): Promise<Row[]> {
  const res = await fetch('/top_miners.csv')
  const text = await res.text()
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',')
  return lines.slice(1).map(line => {
    const vals = line.split(',')
    return {
      subnet_uid: parseInt(vals[0]),
      top_miner_uid: parseInt(vals[1]),
      incentive_amount: parseFloat(vals[2]),
    }
  })
}

function runQuery(sql: string) {
  const errorEl = document.getElementById('error')!
  const statsEl = document.getElementById('stats')!
  errorEl.textContent = ''
  try {
    const start = performance.now()
    currentResult = alasql(sql, [data])
    const ms = (performance.now() - start).toFixed(1)
    statsEl.textContent = `${currentResult.length} rows · ${ms}ms`
    sortCol = null
    renderTable(currentResult)
  } catch (e: any) {
    errorEl.textContent = e.message
  }
}

function renderTable(rows: any[]) {
  const container = document.getElementById('table-container')!
  if (!rows.length) {
    container.innerHTML = '<p style="color:#666;padding:1rem">No results</p>'
    return
  }
  const cols = Object.keys(rows[0])
  const numCols = new Set(['subnet_uid', 'top_miner_uid', 'incentive_amount'])

  const ths = cols.map(c => {
    const cls = [sortCol === c ? 'sorted' : '', numCols.has(c) ? 'num' : ''].filter(Boolean).join(' ')
    const arrow = sortCol === c ? (sortAsc ? ' ↑' : ' ↓') : ''
    return `<th class="${cls}" data-col="${c}">${c}${arrow}</th>`
  }).join('')

  const trs = rows.map(r =>
    '<tr>' + cols.map(c => {
      const v = r[c]
      const isNum = typeof v === 'number'
      const display = isNum ? (Number.isInteger(v) ? v : v.toFixed(6)) : v
      return `<td class="${isNum ? 'num' : ''}">${display}</td>`
    }).join('') + '</tr>'
  ).join('')

  container.innerHTML = `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`

  // sortable headers
  container.querySelectorAll('th').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col!
      if (sortCol === col) sortAsc = !sortAsc
      else { sortCol = col; sortAsc = true }
      currentResult.sort((a, b) => {
        const av = a[col], bv = b[col]
        if (av < bv) return sortAsc ? -1 : 1
        if (av > bv) return sortAsc ? 1 : -1
        return 0
      })
      renderTable(currentResult)
    })
  })
}

function setupFilters() {
  const minInc = document.getElementById('filter-min-inc') as HTMLInputElement
  const maxInc = document.getElementById('filter-max-inc') as HTMLInputElement
  const subnetFilter = document.getElementById('filter-subnet') as HTMLInputElement

  const apply = () => {
    let sql = 'SELECT * FROM data WHERE 1=1'
    const min = parseFloat(minInc.value)
    const max = parseFloat(maxInc.value)
    const sn = subnetFilter.value.trim()
    if (!isNaN(min)) sql += ` AND incentive_amount >= ${min}`
    if (!isNaN(max)) sql += ` AND incentive_amount <= ${max}`
    if (sn) sql += ` AND subnet_uid = ${parseInt(sn)}`
    sql += ' ORDER BY incentive_amount DESC'
    const textarea = document.getElementById('query') as HTMLTextAreaElement
    textarea.value = sql
    runQuery(sql)
  }

  minInc.addEventListener('input', apply)
  maxInc.addEventListener('input', apply)
  subnetFilter.addEventListener('input', apply)
}

async function init() {
  data = await loadCSV()
  // register as alasql table
  alasql('CREATE TABLE data (subnet_uid INT, top_miner_uid INT, incentive_amount FLOAT)')
  alasql.tables['data'].data = data

  document.getElementById('app')!.innerHTML = `
    <h1>⛏ Metagraph Explorer</h1>
    <p class="subtitle">${data.length} subnets · top miner by incentive · SQL queries via AlaSQL</p>

    <div class="filters">
      <div class="filter-group">
        <label>Subnet UID</label>
        <input id="filter-subnet" type="number" placeholder="all" />
      </div>
      <div class="filter-group">
        <label>Min Incentive</label>
        <input id="filter-min-inc" type="number" step="0.01" placeholder="0" />
      </div>
      <div class="filter-group">
        <label>Max Incentive</label>
        <input id="filter-max-inc" type="number" step="0.01" placeholder="1" />
      </div>
    </div>

    <div class="query-section">
      <textarea id="query" rows="2">${DEFAULT_QUERY}</textarea>
      <div class="controls">
        <button id="run-btn">Run Query (⌘↵)</button>
        <button id="reset-btn">Reset</button>
        <span id="stats" class="stats"></span>
      </div>
      <div id="error" class="error"></div>
    </div>

    <div id="table-container"></div>
  `

  document.getElementById('run-btn')!.addEventListener('click', () => {
    runQuery((document.getElementById('query') as HTMLTextAreaElement).value)
  })

  document.getElementById('reset-btn')!.addEventListener('click', () => {
    (document.getElementById('query') as HTMLTextAreaElement).value = DEFAULT_QUERY;
    (document.getElementById('filter-subnet') as HTMLInputElement).value = '';
    (document.getElementById('filter-min-inc') as HTMLInputElement).value = '';
    (document.getElementById('filter-max-inc') as HTMLInputElement).value = '';
    runQuery(DEFAULT_QUERY)
  })

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      runQuery((document.getElementById('query') as HTMLTextAreaElement).value)
    }
  })

  setupFilters()
  runQuery(DEFAULT_QUERY)
}

init()
