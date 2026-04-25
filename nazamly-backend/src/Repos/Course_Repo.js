const Base_Repo = require("./Base_Repo");
const Course = require("../models/academic/course.model");

/**
 * الحقول المسموح تعديلها في الـ Course
 * courseCode ممنوع يتعدل عشان هو المعرف الأساسي للمادة
 */
const ALLOWED_UPDATE_FIELDS = [
  "courseName",
  "level",
  "creditHours",
  "departments",
];

/**
 * Course_Repo - الـ Repository الخاص بالمواد الدراسية
 * بيعمل extends للـ Base_Repo وبيضيف functions خاصة بالـ Course
 * بيورث كل العمليات الأساسية (create, findAll, findById, update, delete) من Base_Repo
 * كل العمليات فيها Mongoose Validation (runValidators: true)
 * كل الـ queries بتتجاهل البيانات الممسوحة (Soft Delete)
 */
class Course_Repo extends Base_Repo {
  /**
   * Constructor - بيبعت الـ Course Model للـ Base_Repo
   * كده الـ Base_Repo هيعرف يشتغل على الـ courses collection
   */
  constructor() {
    super(Course);
  }

  /**
   * _validateUpdateData - (Private) بيعمل validation على البيانات قبل التعديل
   * بيشيل أي حقل مش مسموح بتعديله (زي courseCode)
   * ولو مفيش أي حقل صالح بيرمي Error
   *
   * @param {Object} data - البيانات اللي جاية للتعديل
   * @returns {Object} البيانات بعد الفلترة (الحقول المسموحة بس)
   * @throws {Error} لو مفيش أي حقل صالح للتعديل
   */
  _validateUpdateData(data) {
    const filteredData = {};
    for (const key of Object.keys(data)) {
      if (ALLOWED_UPDATE_FIELDS.includes(key)) {
        filteredData[key] = data[key];
      }
    }

    if (Object.keys(filteredData).length === 0) {
      throw new Error(
        `No valid fields to update. Allowed fields: [${ALLOWED_UPDATE_FIELDS.join(", ")}]`,
      );
    }

    return filteredData;
  }

  /**
   * update - (Override) بتعدل مادة عن طريق الـ ID
   * بتعمل validation الأول وبتشغل Mongoose Validators
   * بتتجاهل الممسوح (Soft Deleted)
   * الحقول الممنوعة: courseCode
   *
   * @param {String} id - الـ MongoDB ObjectId
   * @param {Object} data - البيانات الجديدة (هيتم فلترتها تلقائياً)
   * @returns {Promise<Object|null>} المادة بعد التعديل
   * @throws {Error} لو مفيش حقول صالحة للتعديل
   */
  async update(id, data) {
    const validData = this._validateUpdateData(data);
    return await this.model.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      validData,
      {
        returnDocument: 'after',
        runValidators: true,
      },
    );
  }

  /**
   * جلب المواد بناءً على المستوى الدراسي (1, 2, 3, 4)
   * @param {Number} level - المستوى الدراسي
   * @returns {Promise<Array>} array فيه كل المواد في المستوى ده
   */
  async findByLevel(level) {
    return await this.model
      .find({ level, isDeleted: { $ne: true } })
      .populate("departments");
  }

  /**
   * جلب المواد التابعة لقسم معين
   * @param {String} departmentId - الـ MongoDB ObjectId بتاع القسم
   * @returns {Promise<Array>} array فيه كل المواد في القسم ده
   */
  async findByDepartment(departmentId) {
    return await this.model.find({
      departments: departmentId,
      isDeleted: { $ne: true },
    });
  }

  /**
   * البحث عن مادة بواسطة الكود الخاص بها (مثل CS101)
   * @param {String} code - كود المادة
   * @returns {Promise<Object|null>} المادة لو لقاها أو null
   */
  async findByCode(code) {
    return await this.model.findOne({
      courseCode: code.toUpperCase(),
      isDeleted: { $ne: true },
    });
  }

  /**
   * جلب المواد التي لها عدد ساعات معينة
   * @param {Number} hours - عدد الساعات
   * @returns {Promise<Array>} array فيه كل المواد بعدد الساعات ده
   */
  async findByCreditHours(hours) {
    return await this.model.find({
      creditHours: hours,
      isDeleted: { $ne: true },
    });
  }
}

// بنعمل export لـ instance من Course_Repo عشان نستخدمه على طول في أي مكان
module.exports = new Course_Repo();
