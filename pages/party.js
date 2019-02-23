import PartyList from '../components/Party'

const Party = props => <PartyList {...props} />
Party.getInitialProps = async ({ query }) => query

export default Party
