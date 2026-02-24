import { TextInput, View, ViewStyle , KeyboardTypeOptions} from 'react-native';
interface InputFiledProps {
    placeholder: string;
    value: string;
    onChangeText: (text: string) => void;
    style: ViewStyle;
    keyboardType: KeyboardTypeOptions;
}
const InputFiled = ({ placeholder, value, onChangeText , style ,keyboardType}: InputFiledProps) => {
    return (
        <View style={style}>
            <TextInput placeholder={placeholder} value={value} onChangeText={onChangeText} keyboardType={keyboardType} />
        </View>
    )
}
export default InputFiled;