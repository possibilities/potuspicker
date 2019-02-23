import Avatar from '@material-ui/core/Avatar'
import Typography from '@material-ui/core/Typography'
import { withStyles } from '@material-ui/core/styles'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemText from '@material-ui/core/ListItemText'
import candidates from '../candidates.json'
import Dialog from '@material-ui/core/Dialog'
import Divider from '@material-ui/core/Divider'
import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import IconButton from '@material-ui/core/IconButton'
import CloseIcon from '@material-ui/icons/Close'
import strftime from 'strftime'
import find from 'lodash/find'
import Router from 'next/router'

const styles = theme => ({
  list: {
    wordWrap: 'break-word'
  },
  appBar: {
    position: 'relative'
  },
  flex: { flex: 1 }
})

const formatDate = birthdate =>
  strftime('%B %d, %Y', new Date(birthdate))

const getAge = birthdate => {
  const ageDifferenceMs = Date.now() - new Date(birthdate).getTime()
  const ageDate = new Date(ageDifferenceMs)
  return Math.abs(ageDate.getUTCFullYear() - 1970)
}

const displayBirthdate = candidate =>
  `${formatDate(candidate.birthdate)} (age ${getAge(candidate.birthdate)})`

const goToUrl = url => () => {
  window.location = url
}

const Candidate = ({ classes, party, id }) => {
  const candidate = find(candidates[party], candidate => candidate.id === id)
  return (
    <Dialog
      open
      fullScreen
      onClose={() => Router.push({
        pathname: '/party',
        query: { party }
      })}>
      <AppBar
        color='default'
        className={classes.appBar}>
        <Toolbar>
          <IconButton
            color='inherit'
            onClick={() => Router.push({
              pathname: '/party',
              query: { party }
            })}>
            <CloseIcon />
          </IconButton>
          <Typography
            variant='h6'
            color='inherit'
            className={classes.flex}>
            {candidate.name}
          </Typography>
          <Avatar
            alt={candidate.name}
            src={candidate.image} />
        </Toolbar>
      </AppBar>
      <List className={classes.list}>
        <ListItem>
          <ListItemText
            primary='Home state'
            secondary={candidate.homeState} />
        </ListItem>
        <ListItem>
          <ListItemText
            primary='Birth date'
            secondary={displayBirthdate(candidate)} />
        </ListItem>
        <ListItem>
          <ListItemText
            primary='Birthplace'
            secondary={candidate.birthplace} />
        </ListItem>
        <Divider />
        <ListItem
          button
          onClick={goToUrl(candidate.campaignUrl)}>
          <ListItemText
            primary='Campaign'
            secondary={candidate.campaignUrl} />
        </ListItem>
        <Divider />
        <ListItem
          button
          onClick={goToUrl(candidate.wikipediaBioUrl)}>
          <ListItemText
            primary='Wikipedia'
            secondary={candidate.wikipediaBioUrl} />
        </ListItem>
      </List>
    </Dialog>
  )
}

Candidate.getInitialProps = async ({ query = {} }) => query

export default withStyles(styles)(Candidate)
