import { StyleSheet } from "react-native";
const Style = StyleSheet.create({
  container: {
    backgroundColor: "#036dd7ff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    borderRadius:10,
  },
  logoContainer: {
    width:164,
    height:164,
    borderRadius: 30,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    objectFit : "contain",
    marginBottom: 25,
    marginTop:20,
  },
  
  logoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
    borderRadius: 30,
  },

  // Brand Name
  brandName: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1a365d", // Dark blue
    marginBottom: 8,
    letterSpacing: 0.5,
  },

  // Title
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2d3748",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 36,
  },

  // Subtitle/Description
  subtitle: {
    fontSize: 16,
    fontWeight: "400",
    color: "#718096",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 8,
  },

  // Tags/Chips Container
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginBottom: 40,
  },

  // Individual Tag/Chip
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e2e8f0",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },

  tagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4299e1", // Blue dot
  },

  tagText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2d3748",
  },
  // Keep your existing auth styles if needed
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  
  link: {
    color: "#007AFF",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    gap: 10,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  orText: {
    textAlign: "center",
    marginVertical: 15,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor:'#000',
    borderRadius: 10,
    gap: 10,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleText: {
    fontSize: 16,
    color: "#fff",
  },
});
export default Style;