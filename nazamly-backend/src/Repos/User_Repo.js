const Base_Repo = require("./Base_Repo");
const User = require("../models/user.model");

/**
 * الحقول المسموح تعديلها - أي حقل مش هنا مش هيتعدل
 * firebaseUid و email ممنوع تعديلهم عشان دول بيانات حساسة
 */
const ALLOWED_UPDATE_FIELDS = ["displayName", "role"];

/**
 * User_Repo - الـ Repository الخاص بالـ User
 * بيعمل extends للـ Base_Repo وبيضيف functions خاصة بالـ User
 * بيورث كل العمليات الأساسية (create, findAll, findById, update, delete) من Base_Repo
 * فيه validation على الـ update عشان يمنع تعديل الحقول الحساسة
 * كل العمليات فيها Mongoose Validation (runValidators: true)
 * كل الـ queries بتتجاهل البيانات الممسوحة (Soft Delete)
 */
class User_Repo extends Base_Repo {
  /**
   * Constructor - بيبعت الـ User Model للـ Base_Repo
   * كده الـ Base_Repo هيعرف يشتغل على الـ Users collection
   */
  constructor() {
    super(User);
  }

  /**
   * _validateUpdateData - (Private) بيعمل validation على البيانات قبل التعديل
   * بيشيل أي حقل مش مسموح بتعديله (زي firebaseUid و email)
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
   * update - (Override) بتعدل بيانات user عن طريق الـ ID
   * بتعمل validation الأول عشان تتأكد إن الحقول مسموح بتعديلها
   * وبتشغل Mongoose Validators على البيانات الجديدة
   * بتتجاهل الممسوح (Soft Deleted)
   * الحقول المسموحة: displayName, role
   * الحقول الممنوعة: firebaseUid, email
   *
   * @param {String} id - الـ MongoDB ObjectId
   * @param {Object} data - البيانات الجديدة (هيتم فلترتها تلقائياً)
   * @returns {Promise<Object|null>} الـ user بعد التعديل
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
   * findByEmail - بتجيب user عن طريق الإيميل بتاعه
   * @param {String} email - الإيميل اللي عايز تدور عليه
   * @returns {Promise<Object|null>} الـ user لو لقاه أو null لو مش موجود
   */
  async findByEmail(email) {
    return await this.model.findOne({ email, isDeleted: { $ne: true } });
  }

  /**
   * findByFirebaseUid - بتجيب user عن طريق الـ Firebase UID بتاعه
   * @param {String} firebaseUid - الـ UID اللي جاي من Firebase Authentication
   * @returns {Promise<Object|null>} الـ user لو لقاه أو null لو مش موجود
   */
  async findByFirebaseUid(firebaseUid) {
    return await this.model.findOne({
      firebaseUid,
      isDeleted: { $ne: true },
    });
  }

  /**
   * findByRole - بتجيب كل الـ users اللي ليهم role معين
   * @param {String} role - الـ role اللي عايز تفلتر بيه (مثلاً "student", "admin")
   * @returns {Promise<Array>} array فيه كل الـ users اللي ليهم الـ role ده
   */
  async findByRole(role) {
    return await this.model.find({ role, isDeleted: { $ne: true } });
  }

  /**
   * updateByFirebaseUid - بتعدل بيانات user عن طريق الـ Firebase UID
   * بتعمل validation الأول عشان تتأكد إن الحقول مسموح بتعديلها
   * وبتشغل Mongoose Validators على البيانات الجديدة
   * الحقول المسموحة: displayName, role
   * الحقول الممنوعة: firebaseUid, email
   *
   * @param {String} firebaseUid - الـ UID اللي جاي من Firebase Authentication
   * @param {Object} data - البيانات الجديدة (هيتم فلترتها تلقائياً)
   * @returns {Promise<Object|null>} الـ user بعد التعديل
   * @throws {Error} لو مفيش حقول صالحة للتعديل
   */
  async updateByFirebaseUid(firebaseUid, data) {
    const validData = this._validateUpdateData(data);
    return await this.model.findOneAndUpdate(
      { firebaseUid, isDeleted: { $ne: true } },
      validData,
      {
        new: true,
        runValidators: true,
      },
    );
  }

  /**
   * deleteByFirebaseUid - (Soft Delete) بتعلّم user كممسوح عن طريق الـ Firebase UID
   * @param {String} firebaseUid - الـ UID اللي جاي من Firebase Authentication
   * @returns {Promise<Object|null>} الـ user بعد ما اتعلّم كممسوح
   */
  async deleteByFirebaseUid(firebaseUid) {
    return await this.model.findOneAndUpdate(
      { firebaseUid, isDeleted: { $ne: true } },
      { isDeleted: true, deletedAt: new Date() },
      { new: true },
    );
  }
}

// بنعمل export لـ instance من User_Repo عشان نستخدمه على طول في أي مكان
module.exports = new User_Repo();
