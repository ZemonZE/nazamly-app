const Base_Repo = require("./Base_Repo");
const GPAPlan = require("../models/gpaPlan.model");

/**
 * الحقول المسموح تعديلها في الـ GPAPlan
 * userId ممنوع يتعدل عشان الخطة تفضل مرتبطة بصاحبها
 */
const ALLOWED_UPDATE_FIELDS = [
  "currentGPA",
  "completedCredits",
  "targetGPA",
  "targetCredits",
  "requiredFutureGPA",
];

/**
 * GpaPlan_Repo - الـ Repository الخاص بخطة الـ GPA
 * بيعمل extends للـ Base_Repo وبيضيف functions خاصة بالـ GPAPlan
 * بيورث كل العمليات الأساسية (create, findAll, findById, update, delete) من Base_Repo
 * كل العمليات فيها Mongoose Validation (runValidators: true)
 */
class GpaPlan_Repo extends Base_Repo {
  /**
   * Constructor - بيبعت الـ GPAPlan Model للـ Base_Repo
   * كده الـ Base_Repo هيعرف يشتغل على الـ gpaplans collection
   */
  constructor() {
    super(GPAPlan);
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
   * update - (Override) بتعدل خطة الـ GPA عن طريق الـ ID
   * بتعمل validation الأول وبتشغل Mongoose Validators
   * الحقول الممنوعة: userId
   *
   * @param {String} id - الـ MongoDB ObjectId
   * @param {Object} data - البيانات الجديدة (هيتم فلترتها تلقائياً)
   * @returns {Promise<Object|null>} الخطة بعد التعديل
   * @throws {Error} لو مفيش حقول صالحة للتعديل
   */
  async update(id, data) {
    const validData = this._validateUpdateData(data);
    return await this.model.findByIdAndUpdate(id, validData, {
      new: true,
      runValidators: true,
    });
  }

  /**
   * findByUserId - بتجيب خطة الـ GPA بتاعت user معين
   * كل user ليه خطة واحدة بس (unique: true على userId)
   * @param {String} userId - الـ Firebase UID بتاع الـ User
   * @returns {Promise<Object|null>} الخطة لو لقاها أو null لو مفيش
   */
  async findByUserId(userId) {
    return await this.model.findOne({ userId });
  }

  /**
   * updateByUserId - بتعدل خطة الـ GPA بتاعت user معين عن طريق الـ userId
   * بتعمل validation الأول وبتشغل Mongoose Validators
   *
   * @param {String} userId - الـ Firebase UID بتاع الـ User
   * @param {Object} data - البيانات الجديدة (هيتم فلترتها تلقائياً)
   * @returns {Promise<Object|null>} الخطة بعد التعديل
   * @throws {Error} لو مفيش حقول صالحة للتعديل
   */
  async updateByUserId(userId, data) {
    const validData = this._validateUpdateData(data);
    return await this.model.findOneAndUpdate({ userId }, validData, {
      new: true,
      runValidators: true,
    });
  }

  /**
   * upsertByUserId - بتعمل update لو الخطة موجودة أو create لو مش موجودة
   * مفيدة عشان الـ user يقدر يعمل خطة جديدة أو يحدث القديمة بأمر واحد
   *
   * @param {String} userId - الـ Firebase UID بتاع الـ User
   * @param {Object} data - بيانات الخطة
   * @returns {Promise<Object>} الخطة بعد الإنشاء أو التعديل
   */
  async upsertByUserId(userId, data) {
    return await this.model.findOneAndUpdate(
      { userId },
      { ...data, userId },
      { new: true, upsert: true, runValidators: true },
    );
  }

  /**
   * deleteByUserId - بتمسح خطة الـ GPA بتاعت user معين
   * @param {String} userId - الـ Firebase UID بتاع الـ User
   * @returns {Promise<Object|null>} الخطة اللي اتمسحت
   */
  async deleteByUserId(userId) {
    return await this.model.findOneAndDelete({ userId });
  }

  /**
   * updateCurrentGPA - بتحدث الـ GPA الحالي بتاع user معين
   * وبتحسب الـ requiredFutureGPA الجديد تلقائياً
   *
   * @param {String} userId - الـ Firebase UID بتاع الـ User
   * @param {Number} currentGPA - الـ GPA الحالي الجديد (0 - 5.0)
   * @param {Number} completedCredits - عدد الساعات المكتملة
   * @returns {Promise<Object|null>} الخطة بعد التحديث
   */
  async updateCurrentGPA(userId, currentGPA, completedCredits) {
    const plan = await this.model.findOne({ userId });
    if (!plan) return null;

    plan.currentGPA = currentGPA;
    plan.completedCredits = completedCredits;

    // حساب الـ GPA المطلوب في الترمات الجاية
    const remainingCredits = plan.targetCredits - completedCredits;
    if (remainingCredits > 0) {
      const totalTargetPoints = plan.targetGPA * plan.targetCredits;
      const currentPoints = currentGPA * completedCredits;
      plan.requiredFutureGPA =
        (totalTargetPoints - currentPoints) / remainingCredits;
    } else {
      plan.requiredFutureGPA = 0;
    }

    return await plan.save();
  }

  /**
   * calculateRequiredGPA - بتحسب الـ GPA المطلوب عشان الطالب يوصل للـ target
   * دي function حسابية بس، مش بتحفظ حاجة في الداتابيز
   *
   * @param {Number} currentGPA - الـ GPA الحالي
   * @param {Number} completedCredits - الساعات المكتملة
   * @param {Number} targetGPA - الـ GPA المستهدف
   * @param {Number} targetCredits - إجمالي الساعات المستهدفة
   * @returns {Number|null} الـ GPA المطلوب أو null لو مش ممكن
   */
  calculateRequiredGPA(currentGPA, completedCredits, targetGPA, targetCredits) {
    const remainingCredits = targetCredits - completedCredits;
    if (remainingCredits <= 0) return null;

    const requiredGPA =
      (targetGPA * targetCredits - currentGPA * completedCredits) /
      remainingCredits;

    // لو الـ GPA المطلوب أكبر من 5 أو أقل من 0 يبقى مش ممكن
    if (requiredGPA > 5.0 || requiredGPA < 0) return null;

    return Math.round(requiredGPA * 1000) / 1000;
  }
}

// بنعمل export لـ instance من GpaPlan_Repo عشان نستخدمه على طول في أي مكان
module.exports = new GpaPlan_Repo();
