import { createSignal, For, Show } from "solid-js";
import { ChevronDown } from "lucide-solid";

export interface DropdownOption {
  value: string;
  label: string;
  icon?: string;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  class?: string;
}

export default function Dropdown(props: DropdownProps) {
  const [isOpen, setIsOpen] = createSignal(false);

  const selectedOption = () => 
    props.options.find(option => option.value === props.value);

  const handleSelect = (option: DropdownOption) => {
    props.onChange(option.value);
    setIsOpen(false);
  };

  const handleBlur = () => {
    // Small delay to allow click events to fire first
    setTimeout(() => setIsOpen(false), 100);
  };

  return (
    <div class="relative w-full max-w-xs">
      <button
        type="button"
        class={`input input-bordered w-full flex items-center justify-between cursor-pointer ${props.class || ''}`}
        onClick={() => setIsOpen(!isOpen())}
        onBlur={handleBlur}
      >
        <span class="flex items-center gap-2">
          <Show when={selectedOption()?.icon}>
            <img
              src={selectedOption()!.icon}
              alt=""
              class="w-5 h-5"
            />
          </Show>
          <span class={selectedOption()?.value.includes('default') ? 'capitalize' : ''}>
            {selectedOption()?.label || props.placeholder || 'Select...'}
          </span>
        </span>
        <ChevronDown 
          class={`w-4 h-4 transition-transform duration-200 ${
            isOpen() ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>
      <Show when={isOpen()}>
        <ul
          class="absolute left-0 top-full mt-2 z-50 w-full menu bg-base-200 border border-base-300 rounded-box shadow-lg"
          onMouseDown={(e) => e.preventDefault()}
        >
          <For each={props.options}>
            {(option) => (
              <li>
                <button
                  type="button"
                  class="flex items-center gap-2 hover:bg-base-300 w-full text-left px-3 py-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(option);
                  }}
                >
                  <Show when={option.icon}>
                    <img src={option.icon} alt="" class="w-5 h-5" />
                  </Show>
                  <span class={option.value.includes('default') ? 'capitalize' : ''}>
                    {option.label}
                  </span>
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}