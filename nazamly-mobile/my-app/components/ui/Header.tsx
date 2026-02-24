import { View , Text ,Image ,ImageSourcePropType} from "react-native";
import styles from "@/app/(auth)/styles";
const Logo : ImageSourcePropType = require("@/assets/images/Logo design for a mo.png");
export default function Header() {
    return (
        <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Image source={Logo} style={styles.logoImage} />
        </View>
        <Text style={{ color: "black", fontSize: 14 }}>Learn With No Limits </Text>
        <Text style={{ color: "#999999", fontSize: 10 ,marginBottom:10,marginTop:10}}>Start your journey with Nazamly now </Text>
      </View>
    );
}