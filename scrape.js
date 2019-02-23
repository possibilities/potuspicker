const request = require('axios')
const cheerio = require('cheerio')
const slugify = require('slugify')

const baseWikipediaUrl = 'https://en.wikipedia.org/wiki'
const wikipediaElectionSlug = '2020_United_States_presidential_election'

let wikiPageHtml

const run = async () => {
  if (!wikiPageHtml) {
    const response = await request(
      `${baseWikipediaUrl}/${wikipediaElectionSlug}`,
      { responseType: 'html' }
    )
    wikiPageHtml = response.data
  }
  const $ = cheerio.load(wikiPageHtml)

  const extractPersonFromRow = (i, trEl) => {
    const [
      imageAndNameCell,
      birthDateAndPlaceCell,
      // eslint-disable-next-line no-unused-vars
      professionalExperienceCell,
      homeStateCell,
      campaignInfoCell
    ] = $(trEl).find('td').toArray()

    const homeState = $(homeStateCell).find('a').slice(1).text()

    const birthdate = new Date($(birthDateAndPlaceCell).find('span').eq(0).text())
    const birthplace = $(birthDateAndPlaceCell).find('a').text()

    let campaignUrl
    let wikipediaCampaignUrl
    $(campaignInfoCell).find('a').each((i, linkEl) => {
      if ($(linkEl).text() === 'Campaign') {
        const wikipediaCampaignRelativeUrl = $(linkEl).attr('href')
        wikipediaCampaignUrl = `${baseWikipediaUrl}${wikipediaCampaignRelativeUrl}`
      }
      if ($(linkEl).text() === 'Website') {
        campaignUrl = $(linkEl).attr('href')
      }
    })

    const image = $(imageAndNameCell).find('img').attr('src')
    const name = $(imageAndNameCell).find('b a').text()

    const wikipediaBioRelativeUrl = $(imageAndNameCell).find('b a').attr('href')
    const wikipediaBioUrl = `${baseWikipediaUrl}${wikipediaBioRelativeUrl}`

    const id = slugify(name, { lower: true })

    return {
      id,
      name,
      image,
      homeState,
      birthdate,
      birthplace,
      campaignUrl,
      wikipediaBioUrl,
      wikipediaCampaignUrl
    }
  }

  const getCandidatesFromTable = tableIndex =>
    $('.wikitable')
      .eq(tableIndex)
      .find('tr')
      .slice(1)
      .map(extractPersonFromRow)
      .toArray()

  const republican = getCandidatesFromTable(0)
  const democratic = getCandidatesFromTable(1)
  console.info(JSON.stringify({ republican, democratic }, null, 2))
}

run()
