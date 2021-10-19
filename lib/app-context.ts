import { getDockerHost } from "./docker-host";

export class AppContext
{
	#dockerHost: Promise< string > | undefined = undefined;

	constructor(
		public verbose: boolean,
		public teardown: boolean,
		private dockerHostConfig: string
	)
	{
	}

	public async getDockerHost( ): Promise< string >
	{
		if ( this.#dockerHost )
			return this.#dockerHost;

		this.#dockerHost =
			getDockerHost( this.dockerHostConfig, this.verbose );

		return this.#dockerHost;
	}
}
