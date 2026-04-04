const courseRepo = require("../Repos/Course_Repo");

const getAllCourses = async (req, res) => {
  try {
    const result = await courseRepo.findAll({ limit: 100, sort: { courseCode: 1 } });
    return res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("[getAllCourses] Error:", error);
    return res.status(500).json({ success: false, message: "Error retrieving courses", error: error.message });
  }
};

module.exports = { getAllCourses };
