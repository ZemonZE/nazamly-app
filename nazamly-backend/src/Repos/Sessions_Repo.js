const Base_Repo = require("./Base_Repo");
const Session = require("../models/timeTableEntry.model");

/**
 * الحقول المسموح تعديلها في الـ Session
 * userId ممنوع يتعدل عشان الحصة تفضل مرتبطة بصاحبها
 */
const ALLOWED_UPDATE_FIELDS = [
  "courseId",
  "dayOfWeek",
  "startTime",
  "endTime",
  "groupNumber",
  "sessionType",
  "location",
];

/**
 * Sessions_Repo - الـ Repository الخاص بالحصص (محاضرات + سكاشن + لابات)
 * بيعمل extends للـ Base_Repo وبيضيف functions خاصة بالـ Sessions
 * بيورث كل العمليات الأساسية (create, findAll, findById, update, delete) من Base_Repo
 * كل العمليات فيها Mongoose Validation (runValidators: true)
 * كل الـ queries بتتجاهل البيانات الممسوحة (Soft Delete)
 */
class Sessions_Repo extends Base_Repo {
  /**
   * Constructor - بيبعت الـ Session Model للـ Base_Repo
   * كده الـ Base_Repo هيعرف يشتغل على الـ sessions collection
   */
  constructor() {
    super(Session);
  }

  /**
   * _validateUpdateData - (Private) بيعمل validation على البيانات قبل التعديل
   * بيشيل أي حقل مش مسموح بتعديله (زي userId)
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
   * update - (Override) بتعدل session عن طريق الـ ID
   * بتعمل validation الأول وبتشغل Mongoose Validators
   * بتتجاهل الممسوح (Soft Deleted)
   * الحقول الممنوعة: userId
   *
   * @param {String} id - الـ MongoDB ObjectId
   * @param {Object} data - البيانات الجديدة (هيتم فلترتها تلقائياً)
   * @returns {Promise<Object|null>} الـ session بعد التعديل
   * @throws {Error} لو مفيش حقول صالحة للتعديل
   */
  async update(id, data) {
    const validData = this._validateUpdateData(data);
    return await this.model.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      validData,
      {
        new: true,
        runValidators: true,
      },
    );
  }

  /**
   * findByUserId - بتجيب كل الحصص الخاصة بـ user معين
   * @param {String} userId - الـ Firebase UID بتاع الـ User
   * @returns {Promise<Array>} array فيه كل الحصص بتاعت الـ user
   */
  async findByUserId(userId) {
    return await this.model
      .find({ userId, isDeleted: { $ne: true } })
      .populate("courseId");
  }

  /**
   * findByTimeTableId - بتجيب كل الحصص الخاصة بجدول معين
   * مع populate للـ courseId عشان تجيب بيانات المادة
   * @param {String} timeTableId - الـ MongoDB ObjectId بتاع الـ TimeTable
   * @returns {Promise<Array>} array فيه كل الحصص بتاعت الجدول
   */
  async findByTimeTableId(timeTableId) {
    return await this.model
      .find({ timeTableId, isDeleted: { $ne: true } })
      .populate("courseId");
  }

  /**
   * findByCourseId - بتجيب كل الحصص لمادة معينة عن طريق الـ courseId
   * @param {String} courseId - الـ MongoDB ObjectId بتاع الـ Course
   * @returns {Promise<Array>} array فيه كل الحصص للمادة دي
   */
  async findByCourseId(courseId) {
    return await this.model
      .find({ courseId, isDeleted: { $ne: true } })
      .populate("courseId");
  }

  /**
   * findByDay - بتجيب كل الحصص في يوم معين
   * @param {Number} dayOfWeek - اليوم (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
   * @returns {Promise<Array>} array فيه كل الحصص في اليوم ده
   */
  async findByDay(dayOfWeek) {
    return await this.model
      .find({ dayOfWeek, isDeleted: { $ne: true } })
      .populate("courseId");
  }

  /**
   * findBySessionType - بتجيب كل الحصص من نوع معين (Lecture, Section, Lab)
   * @param {String} sessionType - نوع الحصة
   * @returns {Promise<Array>} array فيه كل الحصص من النوع ده
   */
  async findBySessionType(sessionType) {
    return await this.model.find({ sessionType, isDeleted: { $ne: true } });
  }

  /**
   * findUserDaySessions - بتجيب كل حصص user معين في يوم معين
   * مرتبة حسب وقت البداية عشان تطلع بالترتيب الزمني
   * @param {String} userId - الـ Firebase UID بتاع الـ User
   * @param {Number} dayOfWeek - اليوم (0-6)
   * @returns {Promise<Array>} array فيه الحصص مرتبة بوقت البداية
   */
  async findUserDaySessions(userId, dayOfWeek) {
    return await this.model
      .find({ userId, dayOfWeek, isDeleted: { $ne: true } })
      .populate("courseId")
      .sort({ startTime: 1 });
  }

  /**
   * findByUserAndCourse - بتجيب كل حصص user معين لمادة معينة
   * @param {String} userId - الـ Firebase UID بتاع الـ User
   * @param {String} courseId - الـ MongoDB ObjectId بتاع الـ Course
   * @returns {Promise<Array>} array فيه كل الحصص للمادة والـ user
   */
  async findByUserAndCourse(userId, courseId) {
    return await this.model
      .find({ userId, courseId, isDeleted: { $ne: true } })
      .populate("courseId");
  }

  /**
   * findByLocation - بتجيب كل الحصص في مكان معين
   * @param {String} location - اسم المكان (مثلاً "Hall 1")
   * @returns {Promise<Array>} array فيه كل الحصص في المكان ده
   */
  async findByLocation(location) {
    return await this.model.find({ location, isDeleted: { $ne: true } });
  }

  /**
   * softDeleteAllByUserId - (Soft Delete) بتعلّم كل الحصص بتاعت user كممسوحة
   * @param {String} userId - الـ Firebase UID بتاع الـ User
   * @returns {Promise<Object>} نتيجة عملية المسح (عدد الحصص اللي اتعلّمت)
   */
  async softDeleteAllByUserId(userId) {
    return await this.model.updateMany(
      { userId, isDeleted: { $ne: true } },
      { isDeleted: true, deletedAt: new Date() },
    );
  }

  /**
   * createMany - بتعمل إنشاء لأكتر من حصة مرة واحدة
   * بتشغل Mongoose Validators على كل حصة قبل الحفظ
   * مفيدة لما الطالب يضيف جدول كامل دفعة واحدة
   *
   * @param {Array} sessionsArray - array فيه بيانات كل الحصص
   * @returns {Promise<Array>} array فيه الحصص اللي اتعملت
   * @throws {mongoose.Error.ValidationError} لو فيه حصة بياناتها مش صالحة
   */
  async createMany(sessionsArray) {
    return await this.model.insertMany(sessionsArray, {
      runValidators: true,
    });
  }
}

// بنعمل export لـ instance من Sessions_Repo عشان نستخدمه على طول في أي مكان
module.exports = new Sessions_Repo();
