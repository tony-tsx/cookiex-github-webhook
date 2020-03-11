import express from 'express'
import yargs from 'yargs'
import fs from 'fs'
import bodyparser from 'body-parser'
import cors from 'cors'
import { execSync } from 'child_process'
import morgan from 'morgan'

const app = express()

app.use( morgan( 'short' ) )
app.use( cors() )
app.use( bodyparser.urlencoded( { extended: true } ) )
app.use( bodyparser.json() )

interface RepositoryInfo {
  fullname: string
  execute: string | string[]
  path: string
  error?: string
}

interface SystemConfig {
  commandSeparator?: string
}

interface Config {
  system?: SystemConfig
  repositories: RepositoryInfo[]
}

app.all( '*', ( req, res ) => {
  const event = req.headers['X-GitHub-Event']
  if ( !event ) return res.status( 301 ).json( { message: 'Required event from github' } )

  console.log( `Receive event ${event}` )
  const body = req.body
  switch ( event ) {
    case 'ping': return res.status( 204 ).json( {} )
    case 'push': {
      if ( !fs.existsSync( 'config.json' ) ) return res.status( 306 ).json( { message: 'Config Json not exists' } )
      try {
        const contentConfig = fs.readFileSync( 'config.json' ).toString()
        const config: Config = JSON.parse( contentConfig )
        const repositoryFullName = body.repository.full_name

        if ( Array.isArray( config.repositories ) ) {
          const filtred = config.repositories.filter( repository => repository.fullname === repositoryFullName )
          for ( const repository of filtred ) {
            if ( !repository.path ) continue
            const commands = [ `cd ${repository.path}`, ... Array.isArray( repository.execute ) ? repository.execute : [ repository.execute ] ]
            try {
              console.log( `Try execute ${ commands.slice( 1 ) } in ${repository.path}` )
              execSync( commands.join( config.system?.commandSeparator || '&&' ) )
            } catch ( e ) {
              console.log( `Error in execute commands` )
              console.log( `Error Message: ${ 'message' in e ? e.message : typeof e === 'string' ? e : 'No message error' }` )
              if ( repository.error ) {
                console.log( `Execute error command: ${repository.error}` )
                const command = [ `cd ${repository.path}`, repository.error ].join( config.system?.commandSeparator || '&&' )
                try {
                  execSync( command )
                } catch { console.log( `Error command failed` ) }
              }
            }
          }
          return res.status( 200 ).json( {} )
        }

        else return res.status( 301 ).json( { message: 'Repositories is null or not is array' } )
      } catch {
        return res.status( 500 ).json( { message: 'Internal Error' } )
      }
    }
    default: return res.status( 302 ).json( { message: 'Method not allowed' } )
  }

} )

const port = yargs.argv.port || 8001

app.listen( port, () => {
  console.log( `Running server in ${port}` )
} )
