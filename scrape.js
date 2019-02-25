const treeCrawl = require('tree-crawl')
const axios = require('axios')
const slugify = require('slugify')
const takeWhile = require('lodash/takeWhile')
const findIndex = require('lodash/findIndex')
const fromPairs = require('lodash/fromPairs')
const zip = require('lodash/zip')
const get = require('lodash/get')
const { html2json: jsonFromHtml, json2html: htmlFromJson } = require('html2json')
const { existsSync, writeFileSync, readFileSync } = require('fs')
const dateParser = require('date-and-time')

const shouldCacheRequests = process.argv.includes('--cache-requests')

const wikipediaBaseUrl = 'https://en.wikipedia.org'
const wikipediaElectionUrl = '/wiki/2020_United_States_presidential_election'

const cacheRequests = handler => {
  return async (url, ...args) => {
    const urlSlug = `/tmp/potuspicker-${slugify(url)}`
    if (existsSync(urlSlug)) {
      return { data: readFileSync(urlSlug, 'utf8') }
    }
    const { data } = await handler(url, ...args)
    writeFileSync(urlSlug, data, 'utf8')
    return { data }
  }
}

const cacheableRequest = shouldCacheRequests ? cacheRequests(axios) : axios

const findNode = (tree, predicate) => {
  let foundNode
  treeCrawl(tree, (node, context) => {
    if (predicate(node)) {
      foundNode = node
      context.break()
    }
  }, { getChildren: node => node.child })
  return foundNode && foundNode.child
}

const findByClassName = (tree, className) =>
  findNode(tree, node => get(node.attr, 'class') === className)

const getWikipediaContent = async url => {
  const response = await cacheableRequest(url, { responseType: 'html' })
  const wikiPageHtml = response.data
  const wikiPage = jsonFromHtml(wikiPageHtml)
  return findByClassName(wikiPage, 'mw-parser-output')
}

const getCellsFromRow = row =>
  row.child.filter(child => ['td', 'th'].includes(child.tag))

const getHeaderNames = headerRow => headerRow
  .map(column => column.child[0].text.trim())

const getTableFollowingHeader = (table, name) => {
  const indexOfHeader = findIndex(
    table,
    child => (
      child.tag === 'h3' &&
      child.child[0].child[0].text === name
    )
  )
  const [headerRow, ...bodyRows] = table
    .slice(indexOfHeader)
    .find(child => child.tag === 'table').child
    .find(child => child.tag === 'tbody').child
    .filter(child => child.tag === 'tr')
    .map(getCellsFromRow)
  const columnNames = getHeaderNames(headerRow)
  return bodyRows
    .map(bodyRow => fromPairs(zip(columnNames, bodyRow)))
}

const getBirthDateFromRow = row =>
  new Date(get(row.Born, 'child[0].child[0].text'))

const collectText = child => child
  .filter(child => child.tag === 'a' || child.text)
  .map(child => child.text || get(child, 'child[0].text'))
  .join('')
  .trim()

const getBirthPlaceCityFromRow = row => {
  const indexOfFirstLink = findIndex(
    row.Born.child,
    child => child.tag === 'a'
  )
  return collectText(row.Born.child.slice(indexOfFirstLink))
    .split(',')
    .shift()
    .trim()
}

const getBirthPlaceStateFromRow = row => {
  const indexOfFirstLink = findIndex(
    row.Born.child,
    child => child.tag === 'a'
  )
  return collectText(row.Born.child.slice(indexOfFirstLink))
    .split(',')
    .pop()
    .trim()
}

const getBirthPlaceFromRow = row => {
  const state = getBirthPlaceStateFromRow(row)
  const city = getBirthPlaceCityFromRow(row)
  return `${city}, ${state}`
}

const getFullNameFromRow = row => {
  const indexOfNameLink = findIndex(
    row.Name.child,
    child => (
      child.tag === 'a' &&
      child.child[0].node === 'text'
    )
  )
  return collectText(row.Name.child.slice(indexOfNameLink))
}

const wikipediaLink = url =>
  url.startsWith('/wiki') ? wikipediaBaseUrl + url : url

const getWikipediaUrlFromRow = row => {
  const link = row.Name.child.find(child => (
    child.tag === 'a' &&
    child.child[0].node === 'text'
  ))
  return wikipediaLink(link.attr.href)
}

const getImageUrlFromRow = row => {
  const link = row.Name.child.find(child => child.tag === 'a')
  return get(link, 'child[0].attr.src')
}

const getHomeStateFromRow = row => {
  const indexOfNameLink = findIndex(
    row.State.child,
    child => (
      child.tag === 'a' &&
      child.child[0].node === 'text'
    )
  )
  return collectText(row.State.child.slice(indexOfNameLink))
}

const getCampaignUrlFromRow = row => {
  const links = row.Campaign.child.filter(child => (
    child.tag === 'a' &&
    child.child[0].node === 'text'
  ))
  return wikipediaLink(links[1].attr.href)
}

const getWikipediaCampaignUrlFromRow = row => {
  const links = row.Campaign.child.filter(child => (
    child.tag === 'a' &&
    child.child[0].node === 'text'
  ))
  return wikipediaLink(links[0].attr.href)
}

const getCampaignLogoUrlFromRow = row => {
  const links = row.Campaign.child.filter(child => (
    child.tag === 'a' &&
    child.child[0].tag === 'img'
  ))
  return wikipediaLink(links[0].attr.href)
}

const getLegalFilingPdfUrlFromRow = row => {
  const links = row.Campaign.child.filter(child => (
    child.tag === 'a' &&
    child.child[0].node === 'text'
  ))
  const link = links[2]
  return link
    ? wikipediaLink(link.attr.href)
    : null
}

const findDateFollowingString = (findIn, afterText) => {
  const stringParts = findIn.split(afterText)
  if (stringParts.length === 2) {
    const lastPart = stringParts.pop()
    const dateString = lastPart.split(/\s/).slice(0, 3).join(' ')
    return dateParser.parse(dateString, 'MMMM D, YYYY')
  }
  return null
}

const stripConsecutiveSpaces = str => str.replace(/ +/g, ' ')

const getElementText = rootEl => {
  const text = []
  const handleNode = el => {
    if (el.node === 'text') text.push(el.text)
  }
  treeCrawl(rootEl, handleNode, { getChildren: node => node.child })
  return stripConsecutiveSpaces(text.join(' '))
}

const getCampaignExploreDateFromRow = row => {
  const text = getElementText(row.Campaign)
  return findDateFollowingString(text, 'Exploratory committee: ')
}

const getCampaignStartDateFromRow = row => {
  const text = getElementText(row.Campaign)
  return (
    findDateFollowingString(text, 'Campaign: ') ||
    findDateFollowingString(text, 'Announced campaign: ')
  )
}

const stripLinks = element => treeCrawl(
  element,
  (node, context) => {
    if (node.tag === 'a') {
      const span = {
        node: 'element',
        tag: 'span',
        child: node.child
      }
      context.parent.child[context.index] = span
      context.replace(span)
    }
  },
  { getChildren: node => node.child }
)

const stripBold = element => treeCrawl(
  element,
  (node, context) => {
    if (node.tag === 'b') {
      const span = {
        node: 'element',
        tag: 'span',
        child: node.child
      }
      context.parent.child[context.index] = span
      context.replace(span)
    }
  },
  { getChildren: node => node.child }
)

const removeReferenceLinks = element => treeCrawl(
  element,
  (node, context) => {
    if (
      node.tag === 'a' &&
      get(node, 'attr.href', '').startsWith('#cite_note-')
    ) {
      context.parent.child.splice(context.index, 1)
      context.remove()
    }
  },
  { getChildren: node => node.child }
)

const removeNestedTableOfContents = element => {
  return treeCrawl(
    element,
    (node, context) => {
      if (get(node, 'attr.id') === 'toc') {
        context.parent.child.splice(context.index, 1)
        context.remove()
      }
    },
    { getChildren: node => node.child }
  )
}

const stripTitleAttributes = element => treeCrawl(
  element,
  (node, context) => {
    if (get(node, 'attr.title')) {
      const nodeWithoutTitle = {
        ...node,
        attr: {
          ...node.attr,
          title: undefined
        }
      }
      context.parent.child[context.index] = nodeWithoutTitle
      context.replace(nodeWithoutTitle)
    }
  },
  { getChildren: node => node.child }
)

const stripParenthesesIntro = html => {
  const openParenIndex = html.indexOf(' (')
  const closeParenIndex = html.indexOf(')')
  return html.slice(0, openParenIndex) + html.slice(closeParenIndex + 1)
}

const getWikipediaBioFromRow = async row => {
  const url = getWikipediaUrlFromRow(row)
  const elements = await getWikipediaContent(url)
  const indexOfBioTable = findIndex(
    elements,
    child => child.tag === 'table'
  )
  const elementsFromBioTable = elements.slice(indexOfBioTable)
  const indexOfFirstSummaryElement = findIndex(
    elementsFromBioTable,
    child => child.tag === 'p'
  )
  const elementsAfterBioTable = elementsFromBioTable.slice(indexOfFirstSummaryElement)
  const allBioElements = takeWhile(
    elementsAfterBioTable,
    child => !['h2', 'h3', 'h4'].includes(child.tag)
  )
  const summaryElements = allBioElements
    .filter(el => get(el, 'attr.id') !== 'toc')
  summaryElements.forEach(removeNestedTableOfContents)
  summaryElements.forEach(removeReferenceLinks)
  summaryElements.forEach(stripLinks)
  summaryElements.forEach(stripBold)
  summaryElements.forEach(stripTitleAttributes)
  const summaryHtml = summaryElements.map(htmlFromJson).join('')
  // return summaryHtml
  return stripParenthesesIntro(summaryHtml)
}

const getIdFromRow = row => slugify(getFullNameFromRow(row)).toLowerCase()

const getCandidatesFromTable = table => Promise.all(table.map(async row => ({
  id: getIdFromRow(row),
  image: getImageUrlFromRow(row),
  wikipediaUrl: getWikipediaUrlFromRow(row),
  homeState: getHomeStateFromRow(row),
  fullName: getFullNameFromRow(row),
  birthDate: getBirthDateFromRow(row),
  birthPlace: getBirthPlaceFromRow(row),
  campaignUrl: getCampaignUrlFromRow(row),
  wikipediaCampaignUrl: getWikipediaCampaignUrlFromRow(row),
  campaignLogoUrl: getCampaignLogoUrlFromRow(row),
  legalFilingPdfUrl: getLegalFilingPdfUrlFromRow(row),
  campaignExploreDate: getCampaignExploreDateFromRow(row),
  campaignStartDate: getCampaignStartDateFromRow(row),
  wikipediaBio: await getWikipediaBioFromRow(row)
})))

const run = async () => {
  const page = await getWikipediaContent(`${wikipediaBaseUrl}${wikipediaElectionUrl}`)
  const democraticTable = getTableFollowingHeader(page, 'Democratic Party')
  const democratic = await getCandidatesFromTable(democraticTable)
  const republicanTable = getTableFollowingHeader(page, 'Republican Party')
  const republican = await getCandidatesFromTable(republicanTable)
  console.info(JSON.stringify({ democratic, republican }, null, 2))
}

run()
