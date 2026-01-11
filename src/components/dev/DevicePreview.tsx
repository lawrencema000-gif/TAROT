import { useState } from 'react';
import { Smartphone, X, ChevronDown } from 'lucide-react';

interface DeviceConfig {
  name: string;
  width: number;
  height: number;
  borderRadius: number;
  notchStyle: 'pill' | 'punch' | 'none';
}

const devices: DeviceConfig[] = [
  { name: 'Samsung Galaxy S24', width: 360, height: 780, borderRadius: 40, notchStyle: 'punch' },
  { name: 'Samsung Galaxy S23', width: 360, height: 780, borderRadius: 38, notchStyle: 'punch' },
  { name: 'Samsung Galaxy A54', width: 360, height: 800, borderRadius: 36, notchStyle: 'punch' },
  { name: 'Samsung Galaxy Z Fold5', width: 373, height: 840, borderRadius: 32, notchStyle: 'punch' },
  { name: 'Samsung Galaxy Z Flip5', width: 360, height: 748, borderRadius: 36, notchStyle: 'punch' },
  { name: 'Generic Android', width: 360, height: 760, borderRadius: 24, notchStyle: 'none' },
];

interface DevicePreviewProps {
  children: React.ReactNode;
}

export function DevicePreview({ children }: DevicePreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceConfig>(devices[0]);
  const [showDeviceList, setShowDeviceList] = useState(false);
  const [scale, setScale] = useState(0.8);

  if (!isOpen) {
    return (
      <>
        {children}
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-4 z-50 p-3 bg-mystic-800 border border-mystic-600 rounded-full shadow-lg hover:bg-mystic-700 active:scale-95 transition-all"
          title="Open device preview"
        >
          <Smartphone className="w-5 h-5 text-gold" />
        </button>
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-mystic-950 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-mystic-800">
        <div className="flex items-center gap-4">
          <h2 className="font-display text-lg text-mystic-100">Device Preview</h2>

          <div className="relative">
            <button
              onClick={() => setShowDeviceList(!showDeviceList)}
              className="flex items-center gap-2 px-3 py-2 bg-mystic-800 border border-mystic-700 rounded-lg text-sm text-mystic-200 hover:bg-mystic-700 transition-colors"
            >
              {selectedDevice.name}
              <ChevronDown className="w-4 h-4" />
            </button>

            {showDeviceList && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-mystic-800 border border-mystic-700 rounded-lg shadow-xl z-10 overflow-hidden">
                {devices.map((device) => (
                  <button
                    key={device.name}
                    onClick={() => {
                      setSelectedDevice(device);
                      setShowDeviceList(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-mystic-700 transition-colors ${
                      selectedDevice.name === device.name ? 'text-gold bg-mystic-700/50' : 'text-mystic-200'
                    }`}
                  >
                    {device.name}
                    <span className="text-mystic-500 ml-2 text-xs">
                      {device.width}x{device.height}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-mystic-400">Scale:</span>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-24 accent-gold"
            />
            <span className="text-xs text-mystic-400">{Math.round(scale * 100)}%</span>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(false)}
          className="p-2 hover:bg-mystic-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-mystic-400" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-auto p-8 bg-gradient-to-b from-mystic-900 to-mystic-950">
        <div
          className="relative"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          <div
            className="relative bg-mystic-950 overflow-hidden"
            style={{
              width: selectedDevice.width,
              height: selectedDevice.height,
              borderRadius: selectedDevice.borderRadius,
              boxShadow: `
                0 0 0 8px #1a1a25,
                0 0 0 10px #2d2d40,
                0 25px 50px -12px rgba(0, 0, 0, 0.5)
              `,
            }}
          >
            {selectedDevice.notchStyle === 'punch' && (
              <div
                className="absolute top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-mystic-950 rounded-full z-50"
                style={{
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)',
                }}
              />
            )}

            {selectedDevice.notchStyle === 'pill' && (
              <div
                className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-mystic-950 rounded-full z-50"
                style={{
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)',
                }}
              />
            )}

            <div className="w-full h-full overflow-auto">
              {children}
            </div>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-mystic-600 rounded-full" />
          </div>

          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-center">
            <p className="text-xs text-mystic-500">{selectedDevice.name}</p>
            <p className="text-xs text-mystic-600">
              {selectedDevice.width} x {selectedDevice.height}
            </p>
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-mystic-800 text-center">
        <p className="text-xs text-mystic-500">
          Preview mode - Touch interactions work as expected
        </p>
      </div>
    </div>
  );
}
