import { FunctionComponent } from 'preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { JSXInternal } from 'preact/src/jsx';
import { useDetailsToggle } from './use-details-toggle';

// TODO: in future use types package
type SMM = any;

export const Debug: FunctionComponent<{ smm: SMM }> = ({ smm }) => {
  // TODO: find out why <details> can't be toggled by default
  const debugDetailsToggle = useDetailsToggle();

  const { numProc, getNumProc } = useNumProcs(smm);

  const handleKill = useCallback<
    JSXInternal.MouseEventHandler<HTMLButtonElement>
  >(
    async (e) => {
      const signal = e.currentTarget.dataset.signal ?? 'SIGKILL';
      try {
        await smm.Exec.run('pkill', ['-x', '--signal', signal, 'recapture']);
      } catch (err) {
        console.error(err);
        smm.Toast.addToast('Error killing capture', 'error');
      } finally {
        getNumProc();
      }
    },
    [getNumProc, smm]
  );

  return (
    <details ref={debugDetailsToggle.detailsRef}>
      <summary onClick={debugDetailsToggle.summaryOnClick}>Debug Tools</summary>

      <NumProcs numProc={numProc} getNumProc={getNumProc} />
      <button
        className="cs-button"
        style={{ display: 'block', width: '100%', margin: '8px 0' }}
        onClick={handleKill}
        data-signal="SIGKILL"
      >
        Kill all
      </button>
      <button
        className="cs-button"
        style={{ width: '100%' }}
        onClick={handleKill}
        data-signal="SIGINT"
      >
        Interrupt all
      </button>
    </details>
  );
};

const useNumProcs = (smm: SMM) => {
  const [numProc, setNumProc] = useState<number | undefined>(undefined);
  const getNumProc = useCallback(async () => {
    try {
      const { stdout } = await smm.Exec.run('bash', [
        '-c',
        'pgrep -x capture | wc -l',
      ]);
      console.log(Number(stdout));
      setNumProc(Number(stdout));
    } catch (err) {
      console.error(err);
      smm.Toast.addToast(
        'Error getting number of capture processes',
        'error'
      );
    }
  }, [setNumProc, smm]);

  return { numProc, getNumProc };
};

const NumProcs: FunctionComponent<{
  numProc?: number;
  getNumProc: () => Promise<void>;
}> = ({ numProc, getNumProc }) => {
  useEffect(() => {
    getNumProc();
  }, [getNumProc]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
      }}
    >
      <span>
        {typeof numProc !== 'undefined'
          ? `Found ${numProc} capture procs`
          : 'Loading...'}
      </span>
      <button className="cs-button" onClick={getNumProc}>
        Refresh
      </button>
    </div>
  );
};
