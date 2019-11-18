import { delay } from 'already'


export type RetryFunction< T > = ( ) => Promise< T >;

export async function retry< T = boolean >(
    cb: RetryFunction< T >,
    interval: number,
    timeout: number
)
: Promise< T | undefined >
{
    const stopAt = Date.now( ) + timeout;

    let curTime;
    while ( stopAt > ( curTime = Date.now( ) ) )
    {
        const found = await cb( );
        if ( found )
            return found;

        const delayTime = Math.max( interval - ( Date.now( ) - curTime ), 0 );
        await delay( delayTime );
    }

    return;
}
