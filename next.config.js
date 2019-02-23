module.exports = {
  exportPathMap: async function (defaultPathMap) {
    return {
      '/': { page: '/party', query: { party: 'democratic' } },
      '/democratic': { page: '/party', query: { party: 'democratic' } },
      '/republican': { page: '/party', query: { party: 'republican' } }
    }
  }
}
