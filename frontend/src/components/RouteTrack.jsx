import './RouteTrack.css';

const STEPS = ['Submitted', 'Routed', 'In Progress', 'Resolved'];

// Maps a complaint's actual status to a step index on the track.
// "Submitted" -> step 0, but as soon as it's classified it's effectively
// "Routed" too, so we show step 1 filled immediately after submission.
function statusToStep(status) {
  if (status === 'Submitted') return 0;
  if (status === 'Resolved') return 3;
  if (status === 'In Progress') return 2;
  return 1;
}

export default function RouteTrack({ status, compact = false }) {
  const activeStep = statusToStep(status);

  return (
    <div className={`route-track ${compact ? 'route-track--compact' : ''}`}>
      {STEPS.map((label, i) => (
        <div className="route-track__segment" key={label}>
          <div className="route-track__node-wrap">
            <div
              className={`route-track__node ${i <= activeStep ? 'is-filled' : ''} ${
                i === activeStep ? 'is-current' : ''
              }`}
            />
            {i < STEPS.length - 1 && (
              <div className={`route-track__line ${i < activeStep ? 'is-filled' : ''}`} />
            )}
          </div>
          <span className={`route-track__label ${i <= activeStep ? 'is-active' : ''}`}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
