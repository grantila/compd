
const allSignals: Array< NodeJS.Signals > =
[
	"SIGABRT", "SIGALRM", "SIGBUS", "SIGCHLD", "SIGCONT", "SIGFPE", "SIGHUP",
	"SIGILL", "SIGINT", "SIGIO", "SIGIOT", "SIGKILL", "SIGPIPE", "SIGPOLL",
	"SIGPROF", "SIGPWR", "SIGQUIT", "SIGSEGV", "SIGSTKFLT", "SIGSTOP",
	"SIGSYS", "SIGTERM", "SIGTRAP", "SIGTSTP", "SIGTTIN", "SIGTTOU",
	"SIGUNUSED", "SIGURG", "SIGUSR1", "SIGUSR2", "SIGVTALRM", "SIGWINCH",
	"SIGXCPU", "SIGXFSZ", "SIGBREAK", "SIGLOST", "SIGINFO",
];

const badSignals: Array< NodeJS.Signals > = [ "SIGKILL", "SIGSTOP" ];

const signals = allSignals.filter( sig => !badSignals.includes( sig ) );

export type ForwardSignalHandler = ( signal: NodeJS.Signals ) => void;
export type ForwardSignalCleanup = ( ) => void;

export function forwardSignals( cb: ForwardSignalHandler )
: ForwardSignalCleanup
{
	signals.forEach( signal =>
	{
		process.addListener( signal, cb );
	} );

	return ( ) =>
	{
		signals.forEach( signal =>
		{
			process.removeListener( signal, cb );
		} );
	};
}
