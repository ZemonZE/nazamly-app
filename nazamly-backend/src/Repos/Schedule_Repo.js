const Base_Repo = require("./Base_Repo");
const Schedule = require("../models/schedule/timeTable.model");

/**
 * الحقول المسموح تعديلها في الـ Schedule
 * userId ممنوع يتعدل عشان العلاقات تفضل سليمة
 */
const ALLOWED_UPDATE_FIELDS = [
  "title",
  "isActive",
  "totalCreditHours",
  "entries",
  "sourceType",
  "aiInputRaw",
];

/**
 * Schedule_Repo - الـ Repository الخاص بالجداول الدراسية (TimeTable)
 * بيعمل extends للـ Base_Repo وبيضيف functions خاصة بالـ TimeTable
 * بيورث كل العمليات الأساسية (create, findAll, findById, update, delete) من Base_Repo
 * كل العمليات فيها Mongoose Validation (runValidators: true)
 * بيستخدم Transactions في العمليات المعقدة (زي setActive)
 *
 * العلاقة: User → TimeTable → TimeTableEntry[] → Course
 */
class Schedule_Repo extends Base_Repo {
  /**
   * Constructor - بيبعت الـ Schedule Model للـ Base_Repo
   * كده الـ Base_Repo هيعرف يشتغل على الـ schedules collection
   */
  constructor() {
    super(Schedule);
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
   * update - (Override) بتعدل Schedule عن طريق الـ ID
   * بتعمل validation الأول وبتشغل Mongoose Validators
   * بتتجاهل الـ documents الممسوحة (isDeleted = true)
   * الحقول الممنوعة: userId
   *
   * @param {String} id - الـ MongoDB ObjectId
   * @param {Object} data - البيانات الجديدة (هيتم فلترتها تلقائياً)
   * @returns {Promise<Object|null>} الـ Schedule بعد التعديل
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
   * findByUserId - بتجيب كل الجداول الخاصة بـ user معين
   * مع populate للـ entries (TimeTableEntry) والـ courseId
   * بتتجاهل الممسوح (Soft Deleted)
   * @param {String} userId - الـ Firebase UID بتاع الـ User
   * @returns {Promise<Array>} array فيه كل الجداول بتاعت الـ user
   */
  async findByUserId(userId) {
    return await this.model
      .find({ userId, isDeleted: { $ne: true } })
      .populate({
        path: "entries",
        populate: { path: "courseId" },
      });
  }

  /**
   * findActiveByUserId - بتجيب الجدول النشط (isActive = true) بتاع user معين
   * @param {String} userId - الـ Firebase UID بتاع الـ User
   * @returns {Promise<Object|null>} الجدول النشط أو null لو مفيش
   */
  async findActiveByUserId(userId) {
    return await this.model
      .findOne({ userId, isActive: true, isDeleted: { $ne: true } })
      .populate({
        path: "entries",
        populate: { path: "courseId" },
      });
  }

  /**
   * setActive - بتفعّل جدول معين وتلغي تفعيل باقي الجداول بتاعت نفس الـ user
   * عشان يكون فيه جدول واحد بس نشط في نفس الوقت
   *
   * ⚡ بتستخدم Mongoose Transaction عشان العمليتين ينجحوا مع بعض أو يفشلوا مع بعض
   * كده لو حصل مشكلة في الخطوة التانية، الخطوة الأولى بتترجع تلقائياً
   *
   * @param {String} scheduleId - الـ MongoDB ObjectId بتاع الـ Schedule اللي عايز تفعله
   * @param {String} userId - الـ Firebase UID بتاع الـ User
   * @returns {Promise<Object|null>} الجدول بعد التفعيل
   * @throws {Error} لو حصل أي مشكلة في أي خطوة
   */
  async setActive(scheduleId, userId) {
    const session = await this.startTransaction();
    try {
      // الخطوة 1: الغي تفعيل كل الجداول بتاعت الـ user
      await this.model.updateMany(
        { userId, isDeleted: { $ne: true } },
        { isActive: false },
        { runValidators: true, session },
      );

      // الخطوة 2: فعّل الجدول المطلوب
      const result = await this.model.findByIdAndUpdate(
        scheduleId,
        { isActive: true },
        { new: true, runValidators: true, session },
      );

      // ✅ العمليتين نجحوا - احفظ التغييرات
      await session.commitTransaction();
      return result;
    } catch (error) {
      // ❌ حصل خطأ - ارجع كل حاجة زي ما كانت
      await session.abortTransaction();
      throw error;
    } finally {
      // نهاية الـ session في كل الأحوال
      session.endSession();
    }
  }

  /**
   * addEntry - بتضيف entry (حصة) على جدول موجود
   * @param {String} timeTableId - الـ MongoDB ObjectId بتاع الـ TimeTable
   * @param {String} entryId - الـ MongoDB ObjectId بتاع الـ TimeTableEntry اللي عايز تضيفها
   * @returns {Promise<Object|null>} الجدول بعد الإضافة
   */
  async addEntry(timeTableId, entryId) {
    return await this.model.findOneAndUpdate(
      { _id: timeTableId, isDeleted: { $ne: true } },
      { $addToSet: { entries: entryId } },
      { new: true, runValidators: true },
    );
  }

  /**
   * removeEntry - بتشيل entry (حصة) من جدول موجود
   * @param {String} timeTableId - الـ MongoDB ObjectId بتاع الـ TimeTable
   * @param {String} entryId - الـ MongoDB ObjectId بتاع الـ TimeTableEntry اللي عايز تشيلها
   * @returns {Promise<Object|null>} الجدول بعد الإزالة
   */
  async removeEntry(timeTableId, entryId) {
    return await this.model.findOneAndUpdate(
      { _id: timeTableId, isDeleted: { $ne: true } },
      { $pull: { entries: entryId } },
      { new: true, runValidators: true },
    );
  }

  /**
   * updateTotalCreditHours - بتحدث إجمالي عدد الساعات في الجدول
   * بتشغل Mongoose Validators عشان تتأكد إن القيمة بين 0 و 19
   * @param {String} scheduleId - الـ MongoDB ObjectId بتاع الـ Schedule
   * @param {Number} totalCreditHours - إجمالي عدد الساعات الجديد
   * @returns {Promise<Object|null>} الجدول بعد التحديث
   */
  async updateTotalCreditHours(scheduleId, totalCreditHours) {
    return await this.model.findOneAndUpdate(
      { _id: scheduleId, isDeleted: { $ne: true } },
      { totalCreditHours },
      { new: true, runValidators: true },
    );
  }

  /**
   * findByTitle - بتدور على جداول بالاسم (بحث جزئي - مش لازم الاسم كامل)
   * @param {String} title - جزء من اسم الجدول اللي عايز تدور عليه
   * @returns {Promise<Array>} array فيه كل الجداول اللي اسمها فيه الكلمة دي
   */
  async findByTitle(title) {
    return await this.model.find({
      title: { $regex: title, $options: "i" },
      isDeleted: { $ne: true },
    });
  }

  /**
   * findUserSchedules - بتجيب كل الجداول بتاعت user معين مع كل البيانات
   * مرتبة من الأحدث للأقدم
   * @param {String} userId - الـ Firebase UID بتاع الـ User
   * @returns {Promise<Array>} array فيه كل الجداول مرتبة بالتاريخ
   */
  async findUserSchedules(userId) {
    return await this.model
      .find({ userId, isDeleted: { $ne: true } })
      .populate({
        path: "entries",
        populate: { path: "courseId" },
      })
      .sort({ createdAt: -1 });
  }

  /**
   * softDeleteAllByUserId - (Soft Delete) بتعلّم كل الجداول بتاعت user كممسوحة
   * @param {String} userId - الـ Firebase UID بتاع الـ User
   * @returns {Promise<Object>} نتيجة عملية المسح (عدد الجداول اللي اتعلّمت)
   */
  async softDeleteAllByUserId(userId) {
    return await this.model.updateMany(
      { userId, isDeleted: { $ne: true } },
      { isDeleted: true, deletedAt: new Date() },
    );
  }
}

// بنعمل export لـ instance من Schedule_Repo عشان نستخدمه على طول في أي مكان
module.exports = new Schedule_Repo();
