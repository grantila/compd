import { delay } from 'already'

import {
	Detector,
	MatchResult,
} from './readiness-detectors/types'
import { AppContext } from './app-context'
import { DockerComposeService } from './docker-compose'

function cloneService(
	service: DockerComposeService,
	excludeHostPorts: Array< number >
)
: DockerComposeService
{
	return {
		...service,
		environment: { ...service.environment },
		labels: { ...service.labels },
		ports: service.ports.filter( port =>
			!excludeHostPorts.includes( port.host )
		),
	}
}

export class Readiness
{
	constructor(
		private appContext: AppContext,
		public detectors: ReadonlyArray< Detector >
	)
	{
	}

	async waitForService( service: DockerComposeService )
	{
		const findDetectors = ( ) =>
		{
			const matches: Array< MatchResult & { detector: Detector } > = [ ];
			let handledService = service;

			for ( let i = 0; i < this.detectors.length; ++i )
			{
				const detector = this.detectors[ i ];
				const match = detector.matches( handledService );
				if ( match.ports.length > 0 )
				{
					matches.push( { detector, ...match } );

					if ( match.final )
						handledService = cloneService(
							handledService,
							match.ports.map( port => port.host )
						);
				}
			}

			return matches;
		}

		const matches = findDetectors( );

		if ( matches.length === 0 )
		{
			if ( this.appContext.verbose )
				console.warn(
					`Service ${service.name} is unknown, cannot await it. ` +
					"(This is not a bug or an error)"
				);
			return;
		}
		if ( !matches[ matches.length - 1 ].final )
		{
			if ( this.appContext.verbose )
				console.warn(
					`Service ${service.name} application layer protocol ` +
					"unknown. Can only wait for TCP port to be open. " +
					"(This is not a bug or an error)"
				);
		}

		for ( const match of matches )
		{
			const { detector, ports } = match;

			const waitableService: DockerComposeService = {
				...service,
				ports: [ ...ports ],
			};

			const hostPorts = ports.map( port => port.host ).join( ', ' );
			if ( this.appContext.verbose )
				console.log(
					`Service ${service.name}: ${detector.name} ` +
					`detector, checks ports: ${hostPorts}`
				);

			await detector.waitFor( waitableService );
		}
	}

	async waitForServices( services: ReadonlyArray< DockerComposeService > )
	{
		await Promise.all(
			services.map( async service =>
				await this.waitForService( service )
			)
		);
		await delay( this.appContext.wait * 1000 );
	}
}
