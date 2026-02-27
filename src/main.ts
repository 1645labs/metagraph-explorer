import './style.css'
import alasql from 'alasql'

interface Row {
  subnet_uid: number
  subnet_name: string
  owner_uid: number
  alpha_price_tao: number
  tao_emission_per_tempo: number
  alpha_emission_per_tempo: number
  emission_share_pct: number
  top_miner_uid: number
  top_miner_incentive: number
}

let data: Row[] = []
let currentResult: any[] = []
let sortCol: string | null = null
let sortAsc = true

const DEFAULT_QUERY = 'SELECT * FROM data ORDER BY alpha_price_tao DESC'

async function loadCSV(): Promise<Row[]> {
  const res = await fetch('/subnets.csv')
  const text = await res.text()
  const lines = text.trim().split('\n')
  return lines.slice(1).map(line => {
    const vals = line.split(',')
    return {
      subnet_uid: parseInt(vals[0]),
      subnet_name: vals[1] || '',
      owner_uid: parseInt(vals[2]),
      alpha_price_tao: parseFloat(vals[3]),
      tao_emission_per_tempo: parseFloat(vals[4]),
      alpha_emission_per_tempo: parseFloat(vals[5]),
      emission_share_pct: parseFloat(vals[6]),
      top_miner_uid: parseInt(vals[7]),
      top_miner_incentive: parseFloat(vals[8]),
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
  const numCols = new Set([
    'subnet_uid', 'owner_uid', 'alpha_price_tao', 'tao_emission_per_tempo',
    'alpha_emission_per_tempo', 'emission_share_pct',
    'top_miner_uid', 'top_miner_incentive'
  ])

  const ths = cols.map(c => {
    const cls = [sortCol === c ? 'sorted' : '', numCols.has(c) ? 'num' : ''].filter(Boolean).join(' ')
    const arrow = sortCol === c ? (sortAsc ? ' ↑' : ' ↓') : ''
    return `<th class="${cls}" data-col="${c}">${c}${arrow}</th>`
  }).join('')

  const trs = rows.map(r =>
    '<tr>' + cols.map(c => {
      const v = r[c]
      const isNum = typeof v === 'number'
      let display: string
      if (isNum) {
        display = Number.isInteger(v) ? String(v) : v.toFixed(6)
      } else {
        display = v
      }
      return `<td class="${isNum ? 'num' : ''}">${display}</td>`
    }).join('') + '</tr>'
  ).join('')

  container.innerHTML = `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`

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
  const subnetFilter = document.getElementById('filter-subnet') as HTMLInputElement
  const nameFilter = document.getElementById('filter-name') as HTMLInputElement
  const minPrice = document.getElementById('filter-min-price') as HTMLInputElement
  const minInc = document.getElementById('filter-min-inc') as HTMLInputElement

  const apply = () => {
    let sql = 'SELECT * FROM data WHERE 1=1'
    const sn = subnetFilter.value.trim()
    const name = nameFilter.value.trim()
    const mp = parseFloat(minPrice.value)
    const mi = parseFloat(minInc.value)
    if (sn) sql += ` AND subnet_uid = ${parseInt(sn)}`
    if (name) sql += ` AND LOWER(subnet_name) LIKE '%${name.toLowerCase()}%'`
    if (!isNaN(mp)) sql += ` AND alpha_price_tao >= ${mp}`
    if (!isNaN(mi)) sql += ` AND top_miner_incentive >= ${mi}`
    sql += ' ORDER BY alpha_price_tao DESC'
    const textarea = document.getElementById('query') as HTMLTextAreaElement
    textarea.value = sql
    runQuery(sql)
  }

  subnetFilter.addEventListener('input', apply)
  nameFilter.addEventListener('input', apply)
  minPrice.addEventListener('input', apply)
  minInc.addEventListener('input', apply)
}

async function init() {
  data = await loadCSV()
  alasql('CREATE TABLE data (subnet_uid INT, subnet_name STRING, owner_uid INT, alpha_price_tao FLOAT, tao_emission_per_tempo FLOAT, alpha_emission_per_tempo FLOAT, emission_share_pct FLOAT, top_miner_uid INT, top_miner_incentive FLOAT)')
  alasql.tables['data'].data = data

  document.getElementById('app')!.innerHTML = `
    <h1>⛏ Metagraph Explorer</h1>
    <p class="subtitle">${data.length} subnets · alpha prices, emissions, top miners · SQL via AlaSQL</p>

    <div class="filters">
      <div class="filter-group">
        <label>Subnet UID</label>
        <input id="filter-subnet" type="number" placeholder="all" />
      </div>
      <div class="filter-group">
        <label>Name</label>
        <input id="filter-name" type="text" placeholder="search..." />
      </div>
      <div class="filter-group">
        <label>Min Price (TAO)</label>
        <input id="filter-min-price" type="number" step="0.001" placeholder="0" />
      </div>
      <div class="filter-group">
        <label>Min Incentive</label>
        <input id="filter-min-inc" type="number" step="0.01" placeholder="0" />
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
    (document.getElementById('filter-name') as HTMLInputElement).value = '';
    (document.getElementById('filter-min-price') as HTMLInputElement).value = '';
    (document.getElementById('filter-min-inc') as HTMLInputElement).value = '';
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
