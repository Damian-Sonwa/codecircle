import {useCallback, useEffect, useRef, useState} from 'react';

export const useVoiceRecorder = () => {
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setUnsupported(true);
    }
  }, []);

  const start = useCallback(async () => {
    if (unsupported || isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      chunks.current = [];
      recorder.ondataavailable = (event) => {
        chunks.current.push(event.data);
      };
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Voice recorder error', error);
      setUnsupported(true);
    }
  }, [unsupported, isRecording]);

  const stop = useCallback(() => {
    return new Promise<Blob | null>((resolve) => {
      const recorder = mediaRecorder.current;
      if (!recorder) {
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(chunks.current, {type: 'audio/webm'});
        chunks.current = [];
        setIsRecording(false);
        resolve(blob);
      };
      recorder.stop();
    });
  }, []);

  return {start, stop, isRecording, unsupported};
};


