import Avatar from '@material-ui/core/Avatar'
import Router from 'next/router'
import { withStyles } from '@material-ui/core/styles'
import candidates from '../candidates.json'
import { unstable_useMediaQuery as useMediaQuery }
  from '@material-ui/core/useMediaQuery'
import { Fragment } from 'react'
import AppBar from '@material-ui/core/AppBar'
import Tabs from '@material-ui/core/Tabs'
import Tab from '@material-ui/core/Tab'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemAvatar from '@material-ui/core/ListItemAvatar'
import ListItemText from '@material-ui/core/ListItemText'

const styles = theme => ({
  list: {
    wordWrap: 'break-word'
  },
  appBar: {
    position: 'relative'
  },
  flex: { flex: 1 }
})

const Party = ({ classes, party }) => {
  const isSmallScreen = useMediaQuery('(max-width:600px)')
  return (
    <>
      <AppBar position='static' color='default'>
        <Tabs
          value={party}
          centered={!isSmallScreen}
          variant={isSmallScreen ? 'fullWidth' : 'standard'}
          textColor='primary'
          indicatorColor='primary'
          onChange={(e, party) => Router.push(
            { query: { party }, pathname: '/party' },
            `/${party}`
          )}>
          <Tab label='Democratic' value='democratic' />
          <Tab label='Republican' value='republican' />
        </Tabs>
      </AppBar>
      <Fragment>
        <List component='nav'>
          {candidates[party].map(candidate => (
            <ListItem key={candidate.id} button onClick={() => Router.push(
              {
                pathname: '/candidate',
                query: { party, id: candidate.id }
              },
              `/${party}/${candidate.id}`
            )}>
              <ListItemAvatar>
                <Avatar
                  alt={candidate.name}
                  src={candidate.image} />
              </ListItemAvatar>
              <ListItemText
                inset
                primary={candidate.name}
                secondary={candidate.homeState}
              />
            </ListItem>
          ))}
        </List>
      </Fragment>
    </>
  )
}

export default withStyles(styles)(Party)
