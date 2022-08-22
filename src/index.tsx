import { join } from 'path-browserify';
import { FunctionComponent, render } from 'preact';
import { useCallback, useState } from 'preact/hooks';
import { Debug } from './debug';

// TODO: in future use types package
type SMM = any;

export const load = (smm: SMM) => {
  const style = document.createElement('style');
  style.dataset.recaptureStyles = '';
  style.type = 'text/css';
  style.appendChild(
    document.createTextNode(`
      @keyframes blink {
        50% {
          opacity: 0;
        }
      }

      .recording-indicator {
        animation: blink 0.5s;
      }
    `)
  );
  document.head.appendChild(style);

  smm.InGameMenu.addMenuItem({
    id: 'recapture',
    title: 'Recapture',
    render: (smm: SMM, root: HTMLElement) => render(<App smm={smm} />, root),
  });
};

export const unload = (smm: SMM) => {
  smm.InGameMenu.removeMenuItem('capture');
  document.querySelector('[data-capture-styles]')?.remove();
};

const App: FunctionComponent<{ smm: SMM }> = ({ smm }) => {
  const [, updateState] = useState<{} | undefined>();
  const rerender = useCallback(() => updateState({}), [updateState]);

  const [recording, setRecording] = useState<
    | {
        pid: number;
        start: Date;
        // Interval to update recording time display
        updateInterval: number;
      }
    | undefined
  >(undefined);

  const toggleRecording = useCallback(
    () =>
      (async () => {
        if (recording) {
          console.log('stop recording');

          try {
            clearInterval(recording.updateInterval);
            const { exitCode, stdout, stderr } = await smm.Exec.stop(
              recording.pid
            );
            setRecording(undefined);
            console.log({ exitCode, stdout, stderr });
            if (exitCode !== 0) {
              throw new Error(`Recording exited with error code ${exitCode}`);
            }
          } catch (err) {
            console.error('Error stopping recording:', err);
            smm.Toast.addToast('Error saving recording', 'error');
          }

          return;
        }

        console.log('start recording');

        try {
          const pid = await startRecording(smm);
          const updateInterval = setInterval(rerender, 1000);
          setRecording({
            pid,
            start: new Date(),
            updateInterval,
          });
        } catch (err) {
          console.error('Error starting recording:', err);
          smm.Toast.addToast('Error starting recording', 'error');
        }
      })(),
    [recording, rerender, setRecording, smm]
  );

  return (
    <div>
      {recording ? (
        <p
          style={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span
            className="recording-indicator"
            style={{
              display: 'inline-block',
              width: 16,
              height: 16,
              borderRadius: 16,
              marginRight: 4,
              backgroundColor: 'rgb(209, 28, 28)',
              animation: 'blink 2s infinite ease',
            }}
          />
          Recording - {getActiveTime(recording.start)}
        </p>
      ) : null}
      <button
        className="cs-button"
        style={{ width: '100%' }}
        onClick={toggleRecording}
        data-cs-gp-in-group="root"
        data-cs-gp-item="record"
        data-cs-gp-init-focus
        >
        {recording ? 'Stop' : 'Start'} Recording
      </button>
      <p>
        Recordings will be saved to <b>/home/deck/Videos/recapture</b>.
      </p>

      <span>Before recording, please:</span>
      <ul style={{
        marginTop: 0,
        paddingLeft: 16,
        listStylePosition: 'outside',
      }}>
        <li>Make a test recording</li>
        <li>Make sure you have free disk space</li>
      </ul>

      <Debug smm={smm} />
    </div>
  );
};

let pluginsPaths: string | undefined = undefined;

const startRecording = async (smm: SMM): Promise<number> => {
  if (typeof pluginsPaths === 'undefined') {
    pluginsPaths = (await smm.FS.getPluginsPath()) as string;
  }

  const depsPath = join(pluginsPaths, 'capture/dist/deps');
  const recapturePath = join(depsPath, 'capture');
  const depsPluginsPath = join(depsPath, 'plugins');
  const depsLibPath = join(depsPath, 'lib');

  const recordCmd = `
      GST_VAAPI_ALL_DRIVERS=1
      GST_PLUGIN_PATH=${depsPluginsPath}
      LD_LIBRARY_PATH=${depsLibPath}
      ${capturePath} record
    `.replace(/\n/g, ' ');

  console.log('Recording command:', recordCmd);

  const { pid } = await smm.Exec.start('bash', ['-c', recordCmd]);

  return pid;
};

const getActiveTime = (start: Date): string => {
  const now = new Date();
  const seconds = Math.round(Math.abs(Number(now) - Number(start)) / 1000);

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds - minutes * 60;

  const minutesPadded = leftPad(String(minutes), 2);
  const secondsPadded = leftPad(String(remainingSeconds), 2);

  return `${minutesPadded}:${secondsPadded}`;
};

const leftPad = (str: string, len: number) => {
  while (str.length < len) {
    str = '0' + str;
  }
  return str;
};
