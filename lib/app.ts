import { oppa } from 'oppa'

import { wrap } from './wrap'
import { AppContext } from './app-context'

const envToBool = (key: string, defaultValue = false) =>
	!process.env[ key ] ? defaultValue : process.env[ key ] !== '0';

const parsed = oppa( {
	name: 'compd',
	description: [
		'Run a command and ensure a docker-compose file is loaded before ' +
		'and teared down after.',
		'compd ensures that the services can respond to input (such as a ' +
		'Postgres server) and *then* runs a command.',
		'After the command finishes, the docker-compose setup is teared down',
	]
} )
.add( {
	name: 'verbose',
	alias: 'v',
	description: 'Verbose output',
	default: false,
	type: 'boolean',
} )
.add( {
	name: 'teardown',
	description: [
		'Tears down the docker-compose after wrapping a command.',
		'Can also be set as COMPD_NO_TEARDOWN=1.'
	],
	default: true,
	type: 'boolean',
	realDefault: !envToBool('COMPD_NO_TEARDOWN', false),
} )
.add( {
	name: 'file',
	alias: 'f',
	description: 'The docker-compose file',
	type: 'string',
} )
.parse( );

const [ command, ...args ] = parsed.rest;
const { file, verbose, teardown } = parsed.args;

if ( !file )
{
	console.error( "Missing requied --file argument" );
	process.exit( 1 );
}

const appContext = new AppContext( verbose, teardown );

wrap( command, args, file, { appContext } )
.then( exitCode =>
{
	process.exit( exitCode );
} )
.catch( err =>
{
	console.error( verbose ? err.stack : err.message );
} );
