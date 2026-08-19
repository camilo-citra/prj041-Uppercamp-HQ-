import { startMeetingIngestionWatcher, runIngestionPipeline } from '../src/agent/meetingIngestionAgent.js';

const isOnce = process.argv.includes('--once');

if (isOnce) {
  console.log('Running Meeting Ingestion Agent one-shot deployment...');
  runIngestionPipeline('CLI --once Trigger');
} else {
  console.log('Starting Meeting Ingestion Agent background watcher...');
  startMeetingIngestionWatcher();
}
