import { ServiceDescriptor, Detector } from './readiness-detectors/types'

export class Readiness
{
	constructor( public detectors: ReadonlyArray< Detector > )
	{
	}

	async waitForService( service: ServiceDescriptor )
	{
		const findDetector = ( ) =>
		{
			for ( let i = 0; i < this.detectors.length; ++i )
			{
				const detector = this.detectors[ i ];
				const ports = detector.matches( service );
				if ( ports.length > 0 )
					return { detector, ports };
			}
		}

		const match = findDetector( );

		if ( !match )
		{
			console.warn(
				`Service ${service.serviceName} not understood, ` +
				"cannot await it."
			);
			return;
		}

		const { detector, ports } = match;

		const waitableService: ServiceDescriptor = {
			...service,
			ports,
		};

		await detector.waitFor( waitableService );
	}

	async waitForServices( services: ReadonlyArray< ServiceDescriptor > )
	{
		await Promise.all(
			services.map( async service =>
				await this.waitForService( service )
			)
		);
	}
}
