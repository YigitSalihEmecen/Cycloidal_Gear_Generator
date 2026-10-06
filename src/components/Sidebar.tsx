import { useState } from 'react';
import type { Model, Report } from '../core/model';
import { DEFAULT_PARAMS, PRESETS, encodeParams, presetParams, type Params } from '../core/params';
import { Field, Section, Segmented, Switch } from './controls';
import { IconAlert, IconCheck, IconDownload, IconLink, IconMoon, IconReset, IconSun, IconAuto, Logo } from './Icons';
import type { ThemeChoice } from '../state/hooks';

interface Props {
  params: Params;
  setParams: (p: Params) => void;
  patch: <K extends keyof Params>(key: K, value: Params[K]) => void;
  model: Model;
  report: Report;
  theme: ThemeChoice;
  onTheme: () => void;
  onExport: () => void;
}

const num = (p: Params, k: keyof Params) => p[k] as number;

export default function Sidebar({ params: p, setParams, patch, model, report, theme, onTheme, onExport }: Props) {
  const [copied, setCopied] = useState(false);
  const f = (k: keyof Params, disabled?: boolean) => (
    <Field name={k} value={num(p, k)} onChange={(key, v) => patch(key, v as never)} disabled={disabled} />
  );
  const errors = report.checks.filter((c) => c.severity === 'error').length;
  const warns = report.checks.filter((c) => c.severity === 'warn').length;
  const activePreset = PRESETS.find((x) => JSON.stringify(presetParams(x.id)) === JSON.stringify(p))?.id ?? 'custom';

  const share = async () => {
    const hash = encodeParams(p);
    const url = window.location.href.split('#')[0] + (hash ? `#${hash}` : '');
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copy this link', url);
    }
  };

  return (
    <aside className="sidebar" aria-label="Design controls">
      <header className="brand">
        <Logo />
        <div className="brand-text">
          <h1>Cycloidal Gear Generator</h1>
          <p>Parametric drive designer</p>
        </div>
        <button type="button" className="icon-btn" onClick={onTheme} aria-label={`Theme: ${theme}. Click to change.`} title={`Theme: ${theme}`}>
          {theme === 'light' ? <IconSun /> : theme === 'dark' ? <IconMoon /> : <IconAuto />}
        </button>
      </header>

      <div className="panel-scroll">
        <div className="preset-row">
          <label htmlFor="preset">Start from</label>
          <select id="preset" value={activePreset} onChange={(e) => e.target.value !== 'custom' && setParams(presetParams(e.target.value))}>
            {activePreset === 'custom' && <option value="custom">Custom design</option>}
            {PRESETS.map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
          </select>
        </div>

        <dl className="stats" aria-label="Design summary">
          <div><dt>Ratio</dt><dd>{model.ratio}:1</dd></div>
          <div><dt>Disc Ø</dt><dd>{report.discOuterDiameter ? report.discOuterDiameter.toFixed(1) : '–'}<small>mm</small></dd></div>
          <div><dt>Max pin Ø</dt><dd>{report.maxPinDiameter ? report.maxPinDiameter.toFixed(1) : '–'}<small>mm</small></dd></div>
          <div><dt>Height</dt><dd>{report.assemblyHeight.toFixed(1)}<small>mm</small></dd></div>
        </dl>

        <section className={`checks${errors ? ' has-error' : warns ? ' has-warn' : ''}`} aria-label="Design checks" aria-live="polite">
          <h2>
            Checks
            <span className="count">{errors ? `${errors} error${errors > 1 ? 's' : ''}` : warns ? `${warns} warning${warns > 1 ? 's' : ''}` : 'All clear'}</span>
          </h2>
          <ul>
            {report.checks.map((c, i) => (
              <li key={i} className={`check check-${c.severity}`}>
                <span className="check-icon">{c.severity === 'ok' ? <IconCheck /> : <IconAlert />}</span>
                <span><strong>{c.title}</strong><span className="check-detail">{c.detail}</span></span>
              </li>
            ))}
          </ul>
        </section>

        <Section title="Reducer" summary={`${p.pins} pins · e ${p.eccentricity}`}>
          {f('pins')}
          {f('pinCircleDiameter')}
          {f('pinDiameter')}
          {f('eccentricity')}
          {f('discClearance')}
        </Section>

        <Section title="Discs" summary={`${p.discCount} × ${p.discThickness} mm`}>
          {f('discCount')}
          {f('discThickness')}
          {p.discCount > 1 && f('discGap')}
          {f('boreDiameter')}
        </Section>

        <Section title="Output" summary={p.outputPins ? `${p.outputPins} × Ø${p.outputPinDiameter}` : 'off'}>
          {f('outputPins')}
          {f('outputPinDiameter', p.outputPins === 0)}
          {f('outputPitchDiameter', p.outputPins === 0)}
          {f('holeClearance', p.outputPins === 0)}
        </Section>

        <Section title="Outer ring" summary={p.ringStyle === 'pins' ? 'roller pins' : 'fused pins'}>
          <Segmented
            label="Pin style"
            value={p.ringStyle}
            options={[{ value: 'integrated', label: 'Fused into ring' }, { value: 'pins', label: 'Separate rollers' }]}
            onChange={(v) => patch('ringStyle', v)}
          />
          {f('ringOuterDiameter')}
          {f('ringOverhang')}
          {p.ringStyle === 'pins' && f('socketFit')}
          {f('mountHoles')}
          {f('mountHoleDiameter', p.mountHoles === 0)}
        </Section>

        <Section title="Input cam" summary={p.camEnabled ? `shaft Ø${p.shaftDiameter}` : 'off'} defaultOpen={false}>
          <Switch label="Generate cam" note="Eccentric lobes, one per disc" checked={p.camEnabled} onChange={(v) => patch('camEnabled', v)} />
          {f('camClearance', !p.camEnabled)}
          {f('shaftDiameter', !p.camEnabled)}
          <Segmented
            label="Shaft hole"
            value={p.shaftStyle}
            options={[{ value: 'd', label: 'D-flat' }, { value: 'round', label: 'Round' }]}
            onChange={(v) => patch('shaftStyle', v)}
          />
        </Section>

        <Section title="Output carrier" summary={p.carrierEnabled ? `${p.carrierThickness} mm plate` : 'off'} defaultOpen={false}>
          <Switch label="Generate carrier" note="Plate with the output pins attached" checked={p.carrierEnabled} onChange={(v) => patch('carrierEnabled', v)} />
          {f('carrierThickness', !p.carrierEnabled)}
        </Section>

        <Section title="Mesh quality" summary={p.resolution} defaultOpen={false}>
          <Segmented
            label="Resolution"
            value={p.resolution}
            options={[{ value: 'draft', label: 'Draft' }, { value: 'standard', label: 'Standard' }, { value: 'fine', label: 'Fine' }]}
            onChange={(v) => patch('resolution', v)}
          />
          <p className="hint always">Fine produces smoother STL curves and larger files.</p>
        </Section>
      </div>

      <footer className="sidebar-foot">
        <button type="button" className="btn btn-primary btn-wide" onClick={onExport} disabled={!model.valid}>
          <IconDownload /> Export parts
        </button>
        <button type="button" className="btn" onClick={share} aria-live="polite">
          <IconLink /> {copied ? 'Copied' : 'Share'}
        </button>
        <button type="button" className="btn" onClick={() => setParams(DEFAULT_PARAMS)} title="Reset all values">
          <IconReset /> Reset
        </button>
      </footer>
    </aside>
  );
}
