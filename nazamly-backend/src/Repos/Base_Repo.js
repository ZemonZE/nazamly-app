const mongoose = require("mongoose");

/**
 * Base_Repo - الكلاس الأساسي لكل الـ Repositories
 * بيوفر العمليات الأساسية (CRUD) اللي أي repo هيحتاجها
 * أي repo تاني هيعمل extends للكلاس ده ويبعتله الـ model بتاعه
 *
 * المميزات:
 * - Mongoose Validation: كل عمليات الكتابة فيها validation
 * - Pagination: findAll بتدعم تقسيم الصفحات (limit + page)
 * - Soft Delete: المسح الوهمي - البيانات بتتعلّم كممسوحة بدل ما تتمسح فعلياً
 * - Transaction Support: دعم الـ Mongoose Transactions للعمليات المعقدة
 */
class Base_Repo {
  /**
   * Constructor - بيستقبل الـ Mongoose Model اللي الـ repo هيشتغل عليه
   * @param {Object} model - الـ Mongoose Model (مثلاً User, Session, etc.)
   */
  constructor(model) {
    this.model = model;
  }

  // ========================
  //    🔍 VALIDATION
  // ========================

  /**
   * validate - بتعمل validation على البيانات من غير ما تحفظها في الداتابيز
   * مفيدة لو عايز تتأكد إن البيانات صح قبل ما تعمل أي عملية
   *
   * @param {Object} data - البيانات اللي عايز تتحقق منها
   * @returns {Promise<void>} بترجع resolved لو البيانات صالحة
   * @throws {mongoose.Error.ValidationError} لو فيه حقل مش صالح
   */
  async validate(data) {
    const doc = new this.model(data);
    await doc.validate();
  }

  // ========================
  //    ✏️ CREATE
  // ========================

  /**
   * create - بتعمل إنشاء document جديد في الداتابيز
   * بتعمل Mongoose Validation تلقائياً قبل الحفظ
   * لو البيانات مش مطابقة للـ Schema، هيرمي ValidationError
   *
   * @param {Object} data - البيانات اللي هتتحفظ
   * @returns {Promise<Object>} الـ document اللي اتعمله create
   * @throws {mongoose.Error.ValidationError} لو البيانات مش صالحة
   */
  async create(data) {
    const doc = new this.model(data);
    return await doc.save();
  }

  // ========================
  //    📖 READ (مع Pagination)
  // ========================

  /**
   * findAll - بتجيب الـ documents من الـ collection مع دعم Pagination
   * بتتجاهل الـ documents اللي isDeleted = true (Soft Deleted)
   *
   * @param {Object} options - خيارات البحث
   * @param {Number} options.page - رقم الصفحة (default: 1)
   * @param {Number} options.limit - عدد النتائج في الصفحة (default: 20, max: 100)
   * @param {Object} options.sort - ترتيب النتائج (default: { createdAt: -1 })
   * @param {Object} options.filter - فلتر إضافي على البيانات
   * @returns {Promise<Object>} { data, pagination: { page, limit, total, totalPages } }
   */
  async findAll({
    page = 1,
    limit = 20,
    sort = { createdAt: -1 },
    filter = {},
  } = {}) {
    // حماية: الحد الأقصى 100 نتيجة في الصفحة
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * safeLimit;

    // إضافة فلتر الـ Soft Delete تلقائياً - متجيبش الممسوح
    const query = { ...filter, isDeleted: { $ne: true } };

    // تنفيذ الـ query والـ count بالتوازي عشان الأداء
    const [data, total] = await Promise.all([
      this.model.find(query).sort(sort).skip(skip).limit(safeLimit),
      this.model.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * findById - بتجيب document واحد عن طريق الـ ID بتاعه
   * بتتجاهل الـ documents اللي isDeleted = true
   *
   * @param {String} id - الـ MongoDB ObjectId
   * @returns {Promise<Object|null>} الـ document لو لقاه أو null لو مش موجود أو ممسوح
   * @throws {mongoose.Error.CastError} لو الـ ID مش بالفورمات الصح
   */
  async findById(id) {
    return await this.model.findOne({ _id: id, isDeleted: { $ne: true } });
  }

  // ========================
  //    ✏️ UPDATE
  // ========================

  /**
   * update - بتعدل document موجود عن طريق الـ ID
   * بتشغل Mongoose Validators على البيانات الجديدة (runValidators: true)
   * بتتجاهل الـ documents اللي isDeleted = true
   *
   * @param {String} id - الـ MongoDB ObjectId للـ document اللي عايز تعدله
   * @param {Object} data - البيانات الجديدة اللي هتتحدث
   * @returns {Promise<Object|null>} الـ document بعد التعديل
   * @throws {mongoose.Error.ValidationError} لو البيانات الجديدة مش صالحة
   */
  async update(id, data) {
    return await this.model.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      data,
      {
        returnDocument: 'after',
        runValidators: true,
      },
    );
  }

  // ========================
  //    🗑️ DELETE (Soft Delete)
  // ========================

  /**
   * delete - (Soft Delete) بتعلّم الـ document كممسوح بدل ما تمسحه فعلياً
   * البيانات بتفضل موجودة في الداتابيز بس مش بتظهر في أي query
   * كده تقدر تسترجعها لو اتمسحت بالغلط
   *
   * @param {String} id - الـ MongoDB ObjectId للـ document اللي عايز تمسحه
   * @returns {Promise<Object|null>} الـ document بعد ما اتعلّم كممسوح
   */
  async delete(id) {
    return await this.model.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date() },
      { returnDocument: 'after' },
    );
  }

  /**
   * hardDelete - (Hard Delete) بتمسح الـ document نهائياً من الداتابيز
   * ⚠️ تحذير: البيانات هتتمسح للأبد ومش هتقدر تسترجعها
   * استخدم الدالة دي بحذر شديد
   *
   * @param {String} id - الـ MongoDB ObjectId للـ document اللي عايز تمسحه نهائياً
   * @returns {Promise<Object|null>} الـ document اللي اتمسح
   */
  async hardDelete(id) {
    return await this.model.findByIdAndDelete(id);
  }

  /**
   * restore - بتسترجع document اتمسح بالـ Soft Delete
   * بترجع isDeleted لـ false وبتشيل deletedAt
   *
   * @param {String} id - الـ MongoDB ObjectId للـ document اللي عايز تسترجعه
   * @returns {Promise<Object|null>} الـ document بعد الاسترجاع
   */
  async restore(id) {
    return await this.model.findByIdAndUpdate(
      id,
      { isDeleted: false, $unset: { deletedAt: 1 } },
      { returnDocument: 'after' },
    );
  }

  /**
   * findDeleted - بتجيب كل الـ documents الممسوحة (Soft Deleted)
   * مفيدة للـ Admin لو عايز يشوف أو يسترجع بيانات ممسوحة
   *
   * @returns {Promise<Array>} array فيه كل الـ documents الممسوحة
   */
  async findDeleted() {
    return await this.model.find({ isDeleted: true });
  }

  // ========================
  //    🔄 TRANSACTIONS
  // ========================

  /**
   * startTransaction - بتبدأ Mongoose Transaction جديدة
   * مفيدة للعمليات اللي فيها أكتر من خطوة ولازم ينجحوا كلهم أو يفشلوا كلهم
   *
   * مثال الاستخدام:
   * const session = await repo.startTransaction();
   * try {
   *   await repo.model.updateMany({...}, {...}, { session });
   *   await repo.model.findByIdAndUpdate(id, {...}, { session });
   *   await session.commitTransaction();
   * } catch (error) {
   *   await session.abortTransaction();
   *   throw error;
   * } finally {
   *   session.endSession();
   * }
   *
   * @returns {Promise<mongoose.ClientSession>} الـ session اللي هتستخدمها في العمليات
   */
  async startTransaction() {
    const session = await mongoose.startSession();
    session.startTransaction();
    return session;
  }
}

// بنعمل export للـ class نفسه مش instance عشان الـ repos التانية تقدر تعمل extends
module.exports = Base_Repo;
