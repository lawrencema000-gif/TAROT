import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Sun, Circle } from 'lucide-react';
import { Tabs, TabPanel } from '../components/ui/Tabs';

type Id = 'today' | 'chart' | 'forecast';

function Harness({ onChange }: { onChange?: (id: Id) => void }) {
  const [value, setValue] = useState<Id>('today');
  return (
    <>
      <Tabs<Id>
        aria-label="Horoscope sections"
        idPrefix="h"
        panels
        value={value}
        onChange={(id) => { onChange?.(id); setValue(id); }}
        items={[
          { id: 'today', label: 'Today', icon: Sun },
          { id: 'chart', label: 'Chart', icon: Circle, locked: true },
          { id: 'forecast', label: 'Forecast', disabled: true },
        ]}
      />
      <TabPanel id="today" value={value} idPrefix="h">Today panel</TabPanel>
      <TabPanel id="chart" value={value} idPrefix="h">Chart panel</TabPanel>
      <TabPanel id="forecast" value={value} idPrefix="h">Forecast panel</TabPanel>
    </>
  );
}

describe('Tabs', () => {
  it('wires the ARIA tab pattern: list, tabs, one panel, ids that point at each other', () => {
    render(<Harness />);
    const list = screen.getByRole('tablist', { name: 'Horoscope sections' });
    const tabs = screen.getAllByRole('tab');
    expect(list).toBeTruthy();
    expect(tabs).toHaveLength(3);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');
    expect(tabs[0].id).toBe('h-tab-today');
    expect(tabs[0].getAttribute('aria-controls')).toBe('h-panel-today');
    // Only the current tab points at a panel: the others' panels are unmounted.
    expect(tabs[1].hasAttribute('aria-controls')).toBe(false);
    // Only the current panel exists, and it names its tab.
    const panels = screen.getAllByRole('tabpanel');
    expect(panels).toHaveLength(1);
    expect(panels[0].id).toBe('h-panel-today');
    expect(panels[0].getAttribute('aria-labelledby')).toBe('h-tab-today');
    expect(panels[0].textContent).toBe('Today panel');
  });

  it('marks the current tab with the underline and the rest without it', () => {
    render(<Harness />);
    const [today, chart] = screen.getAllByRole('tab');
    expect(today.className).toContain('after:bg-gold');
    expect(chart.className).not.toContain('after:bg-gold');
  });

  it('roves focus with arrows, skips disabled tabs, and does not select on arrow', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const [today, chart] = screen.getAllByRole('tab');
    // Only the current tab is in the tab order.
    expect(today.tabIndex).toBe(0);
    expect(chart.tabIndex).toBe(-1);
    today.focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(chart);
    expect(onChange).not.toHaveBeenCalled();
    // Forecast is disabled: ArrowRight from Chart wraps back to Today.
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(today);
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(chart);
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(today);
  });

  it('selects on Enter and on click, and swaps the panel', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const [today, chart] = screen.getAllByRole('tab');
    today.focus();
    await user.keyboard('{ArrowRight}{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('chart');
    expect(screen.getByRole('tabpanel').textContent).toBe('Chart panel');
    expect(chart.getAttribute('aria-selected')).toBe('true');
    await user.click(today);
    expect(onChange).toHaveBeenLastCalledWith('today');
    expect(screen.getByRole('tabpanel').textContent).toBe('Today panel');
  });

  it('without panels, no tab claims to control anything', () => {
    render(
      <Tabs<Id>
        aria-label="Plain"
        value="today"
        onChange={() => {}}
        items={[{ id: 'today', label: 'Today' }, { id: 'chart', label: 'Chart' }, { id: 'forecast', label: 'Forecast' }]}
      />,
    );
    for (const tab of screen.getAllByRole('tab')) expect(tab.hasAttribute('aria-controls')).toBe(false);
  });

  it('a locked tab shows the lock, stays selectable, and a disabled tab is inert', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const [, chart, forecast] = screen.getAllByRole('tab');
    expect(chart.querySelector('svg.lucide-lock')).toBeTruthy();
    await user.click(chart);
    expect(onChange).toHaveBeenLastCalledWith('chart');
    expect((forecast as HTMLButtonElement).disabled).toBe(true);
    await user.click(forecast);
    expect(onChange).not.toHaveBeenCalledWith('forecast');
  });
});
