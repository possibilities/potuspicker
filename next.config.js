const fromPairs = require('lodash/fromPairs')
const candidates = require('./candidates')

module.exports = {
  exportPathMap: async function (defaultPathMap) {
    return fromPairs([
      ['/', { page: '/party', query: { party: 'democratic' } }],
      ['/democratic', { page: '/party', query: { party: 'democratic' } }],
      ['/republican', { page: '/party', query: { party: 'republican' } }],
      ...candidates.democratic.map(candidate => [
        `/democratic/${candidate.id}`,
        { page: '/candidate', query: { party: 'democratic', id: candidate.id } }
      ]),
      ...candidates.republican.map(candidate => [
        `/republican/${candidate.id}`,
        { page: '/candidate', query: { party: 'republican', id: candidate.id } }
      ])
    ])
  }
}
