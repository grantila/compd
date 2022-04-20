import { getDockerHost } from "./docker-host";

export class AppContext
{
	#dockerHost: Promise< string > | undefined = undefined;

	constructor(
		public readonly verbose: boolean,
		public readonly teardown: boolean,
		private readonly dockerHostConfig: string,
		public readonly wait: number
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
