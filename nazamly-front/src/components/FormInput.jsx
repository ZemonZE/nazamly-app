import { IconClose, IconEye } from "../Icons/Icons";

function FormInput({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  icon,
  showClear,
  showToggle,
  showVisible,
  onToggle,
  errorMsg,
  disabled,
}) {
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        <span className="input-icon">{icon}</span>
        <input
          id={id}
          type={showToggle ? (showVisible ? "text" : "password") : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required
          autoComplete="new-password"
          disabled={disabled}
        />
        <div className="input-actions">
          {showToggle && value && (
            <IconEye open={showVisible} onClick={onToggle} />
          )}
          {showClear && value && (
            <IconClose onClick={() => onChange({ target: { value: "" } })} />
          )}
        </div>
      </div>
      {errorMsg && <span className="error-msg">{errorMsg}</span>}
    </div>
  );
}

export default FormInput;
